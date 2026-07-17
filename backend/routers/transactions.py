from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from security import get_current_user_optional
import models, datetime, base64, os, json, uuid
try:
    import pdf_utils
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
from dotenv import load_dotenv
load_dotenv()

router = APIRouter(tags=["Transactions"])

# ── Claude AI ─────────────────────────────────────────────────────
def get_claude():
    try:
        import anthropic
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            return None
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        return None


# ── تصنيف الحسابات: قواعد مشتركة + قاموس استدلال احتياطي ───────────
# نستخدمها في كل مكان نطلب فيه من Claude تصنيف معاملة، وأيضًا كشبكة أمان
# عندما لا يُرسِل العميل بنودًا صريحة (lines) فنحتاج تخمين مجموعة الحساب
# الدائن تلقائيًا بدل تكرار نفس مجموعة الحساب المدين (وهو الخطأ الذي كان
# يجعل "الأصول" لا تتحرك، والصندوق لا ينقص أبدًا عند الشراء).
EXPERT_PERSONA = """أنت محاسب قانوني (CPA) خبير بخبرة عشرين عامًا، دقيق ومتحفظ بطبعك:
لا تخمّن أبدًا عند وجود شك حقيقي، ولا تفترض معلومة غير مذكورة صراحة. هدفك
تصفير الأخطاء تمامًا — تدقيق كل رقم وكل تصنيف مرتين قبل أن تجيب."""

ACCOUNT_GROUP_RULES = """
قواعد تصنيف "account_group" لكل بند على حدة (مهم جدًا، اتبعها بدقة):
- أي شيء يُشترى ليُستخدم في العمل لفترة طويلة (أدوات، معدات، آلات، أثاث، أجهزة،
  سيارات، مبانٍ، مخزون/بضاعة) → account_group = "assets".
- النقدية والبنك (الصندوق، البنك) → account_group = "assets" أيضًا (فهي أصل)،
  وعندما "تخرج" نقدية سدادًا لشيء فهذا يُسجَّل كبند دائن على حساب الصندوق/البنك
  بمجموعة "assets" — أي أن الأصول تنخفض بمقدار ما خرج نقدًا، تمامًا كما يزيد
  الأصل الجديد الذي اشتُري. هذا ضروري جدًا: كل عملية شراء تمس حسابين على الأقل
  من الأصول إن كانت نقدية بالكامل (الأصل الجديد يزيد، النقدية تنقص)، أو تمس
  الأصول والالتزامات معًا إن كانت آجلة أو مجزّأة (جزء نقدي وجزء آجل).
- مصروف يُستهلك فورًا (إيجار، رواتب، كهرباء، تسويق، صيانة بسيطة، وقود) → "expenses".
- بيع بضاعة أو تقديم خدمة للعميل → "revenue".
- تكلفة مباشرة للبضاعة المباعة → "cogs".
- مبلغ مستحق لمورد، قرض، أوراق دفع، أي التزام على الشركة → "liabilities".
- ضخ رأس مال من المالك أو سحب شخصي → "equity".

قاعدة القيد المزدوج (Double-Entry) — إلزامية:
- كل معاملة تُمثَّل كمجموعة "بنود" (lines)، بند واحد على الأقل مدين وبند واحد على
  الأقل دائن، بحيث "مجموع كل البنود المدينة" = "مجموع كل البنود الدائنة" تمامًا.
- إذا كانت العملية مركّبة (مثال: شراء سيارة بمبلغ 100,000 نصفها نقدًا ونصفها آجل)
  فأنشئ أكثر من بندين: بند مدين واحد بكامل قيمة الأصل الجديد (100,000 على حساب
  "السيارة" ضمن assets)، وبندين دائنين: أحدهما على "الصندوق" ضمن assets بقيمة
  الجزء النقدي (50,000)، والآخر على "أوراق الدفع" أو "حسابات دائنة" ضمن
  liabilities بقيمة الجزء الآجل (50,000). هكذا يبقى القيد متوازنًا وتنعكس كل
  الآثار الحقيقية للعملية على الحسابات المختلفة، لا مكان واحد فقط.

قبل أن تستدعي الأداة، راجع داخليًا: هل مجموع بنود المدين = مجموع بنود الدائن
تمامًا؟ هل كل بند مصنَّف حسب طبيعته الحقيقية لا حسب التخمين؟ هل تجاهلت أي
معلومة صريحة ذكرها المستخدم؟ إن كانت أي معلومة أساسية (المبلغ، طريقة السداد،
الأطراف) غامضة بما يمنع قيدًا دقيقًا، اجعل confidence="low" واذكر ذلك بوضوح
في warnings بدل أن تخمّن بثقة زائفة.
"""

GROUP_KEYWORDS = {
    "assets": ["صندوق", "نقد", "بنك", "مخزون", "بضاعة", "أثاث", "معدات", "أدوات",
               "سيارة", "سيارات", "جهاز", "أجهزة", "مبنى", "عميل", "مدين", "أصول"],
    "liabilities": ["دائن", "مستحق", "أوراق الدفع", "قرض", "التزام", "مورد",
                     "ضريبة مستحقة", "رواتب مستحقة", "حسابات دائنة"],
    "equity": ["رأس المال", "المالك", "مسحوبات", "حقوق الملكية", "أرباح مرحّلة"],
    "revenue": ["إيراد", "إيرادات", "مبيعات", "خدمات مقدمة"],
    "cogs": ["تكلفة المبيعات", "تكلفة البضاعة"],
    "expenses": ["مصروف", "مصاريف", "إيجار", "رواتب", "كهرباء", "ماء", "صيانة",
                 "تسويق", "وقود", "اتصالات"],
}

def infer_account_group(name: str, fallback: str = "expenses") -> str:
    """تخمين مجموعة الحساب من اسمه عندما لا تكون معروفة صراحة (شبكة أمان فقط)."""
    if not name:
        return fallback
    for group, keywords in GROUP_KEYWORDS.items():
        if any(k in name for k in keywords):
            return group
    return fallback


LINES_JSON_SPEC = """
"lines": [
  {"account_name": "اسم الحساب", "account_group": "assets/liabilities/equity/revenue/cogs/expenses", "side": "debit أو credit", "amount": 0.00}
]"""


# ── أداة Claude لإنشاء القيد المحاسبي (Structured Tool Use) ────────
# بدل مطالبة النموذج بكتابة JSON كنص حر ثم محاولة تحليله (وهو ما كان يفشل
# أحيانًا برسائل مثل "Unterminated string" عند انقطاع الرد أو وجود أسطر
# جديدة داخل نص الشرح) — نُجبر النموذج على استدعاء "أداة" ببنية محددة سلفًا.
# الـ API نفسه يضمن أن الناتج يطابق البنية، فلا حاجة لأي محاولة تحليل JSON
# يدويًا بعد الآن، ويستحيل هيكليًا أن يفشل التحليل كما كان يحدث سابقًا.
_LINE_SCHEMA = {
    "type": "object",
    "properties": {
        "account_name":  {"type": "string"},
        "account_group": {"type": "string", "enum": ["assets", "liabilities", "equity", "revenue", "cogs", "expenses"]},
        "side":          {"type": "string", "enum": ["debit", "credit"]},
        "amount":        {"type": "number"},
    },
    "required": ["account_name", "account_group", "side", "amount"],
}

JOURNAL_ENTRY_TOOL = {
    "name": "record_journal_entry",
    "description": "تسجيل قيد محاسبي مزدوج كامل ببنوده المدينة والدائنة المتوازنة",
    "input_schema": {
        "type": "object",
        "properties": {
            "description": {"type": "string", "description": "وصف مختصر وواضح للمعاملة"},
            "vendor":      {"type": "string", "description": "اسم المورد أو العميل إن وُجد، وإلا نص فارغ"},
            "date":        {"type": "string", "description": "بصيغة YYYY-MM-DD"},
            "lines":       {"type": "array", "minItems": 2, "items": _LINE_SCHEMA},
            "tx_type":     {"type": "string", "enum": ["invoice", "expense", "journal", "payment"]},
            "party_name":  {"type": "string", "description": "اسم العميل/المورد إن كانت هناك ذمم، وإلا نص فارغ"},
            "party_type":  {"type": "string", "enum": ["customer", "vendor", ""]},
            "confidence":  {"type": "string", "enum": ["high", "medium", "low"]},
            "explanation": {"type": "string", "description": "شرح موجز جدًا (جملة واحدة قصيرة) لسبب هذا التصنيف والتوزيع"},
            "warnings":    {"type": "array", "items": {"type": "string"}},
        },
        "required": ["description", "lines", "explanation"],
    },
}

INVOICE_ENTRY_TOOL = {
    "name": "record_invoice_entry",
    "description": "استخراج بيانات فاتورة وإنشاء قيد محاسبي مزدوج لها، أو طلب توضيح طريقة الدفع من المحاسب إن لزم قبل إتمام القيد",
    "input_schema": {
        "type": "object",
        "properties": {
            "needs_clarification":   {"type": "boolean", "description": "true إن كانت طريقة الدفع غير واضحة ولم يحدّدها المحاسب"},
            "clarification_question": {"type": "string", "description": "سؤال مختصر وواضح للمحاسب (فقط إذا needs_clarification=true)"},
            "vendor":       {"type": "string"},
            "date":         {"type": "string", "description": "YYYY-MM-DD"},
            "amount":       {"type": "number", "description": "المبلغ قبل الضريبة"},
            "tax_amount":   {"type": "number"},
            "total_amount": {"type": "number"},
            "description":  {"type": "string"},
            "tx_type":      {"type": "string", "enum": ["invoice", "expense", "journal", "payment"]},
            "lines":        {"type": "array", "items": _LINE_SCHEMA, "description": "فقط إذا needs_clarification=false"},
            "confidence":   {"type": "string", "enum": ["high", "medium", "low"]},
            "notes":        {"type": "string"},
        },
        "required": ["needs_clarification"],
    },
}


def _call_claude_tool(client, content, tool, max_tokens=2000):
    """
    ينفّذ نداء Claude مجبرًا إياه على استدعاء الأداة المحدَّدة، ويعيد المدخلات
    (input) مباشرة كقاموس بايثون جاهز — بدون أي json.loads يدوي، وبدون أي
    احتمال لخطأ "JSON غير صالح" لأن الـ API نفسه يضمن مطابقة البنية.
    """
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=max_tokens,
        tools=[tool],
        tool_choice={"type": "tool", "name": tool["name"]},
        messages=[{"role": "user", "content": content}],
    )
    if response.stop_reason == "max_tokens":
        raise RuntimeError("انقطع رد النموذج بسبب الحد الأقصى لطول الاستجابة")
    for block in response.content:
        if block.type == "tool_use" and block.name == tool["name"]:
            return block.input
    raise RuntimeError("لم يستدعِ النموذج الأداة المطلوبة")


def _friendly_ai_error(e) -> str:
    """
    يحوّل استثناء Anthropic SDK إلى رسالة عربية واضحة تشخّص السبب الفعلي،
    مع طباعة التفاصيل الكاملة في الطرفية (Terminal) للمطوّر دائمًا.
    """
    print(f"[AI ERROR] {type(e).__name__}: {e}")
    try:
        import anthropic
        if isinstance(e, anthropic.AuthenticationError):
            return "مفتاح ANTHROPIC_API_KEY غير صالح أو منتهي — تحقق منه في ملف .env."
        if isinstance(e, anthropic.PermissionDeniedError):
            return "الحساب المرتبط بالمفتاح لا يملك صلاحية استخدام هذا النموذج."
        if isinstance(e, anthropic.NotFoundError):
            return "اسم النموذج المستخدم غير موجود لدى Anthropic — راجع إعداد الخادم."
        if isinstance(e, anthropic.RateLimitError):
            return "تم تجاوز الحد المسموح من الطلبات مؤقتًا — حاول بعد قليل."
        if isinstance(e, anthropic.APIConnectionError):
            return "تعذّر الوصول لخادم Anthropic — تحقق من اتصال الإنترنت في الخادم."
        if isinstance(e, anthropic.APIStatusError):
            return f"خطأ من خادم Anthropic (رمز {e.status_code}) — راجع طرفية الخادم للتفاصيل."
    except ImportError:
        pass
    return "تعذّر الاتصال بالذكاء الاصطناعي حاليًا. راجع طرفية الخادم للتفاصيل، أو استخدم الإدخال اليدوي."


def _fallback_lines(amount, debit_name="مصروفات عامة", debit_group="expenses", credit_name="الصندوق", credit_group="assets"):
    return [
        {"account_name": debit_name, "account_group": debit_group, "side": "debit", "amount": amount},
        {"account_name": credit_name, "account_group": credit_group, "side": "credit", "amount": amount},
    ]


def _derive_legacy_fields_from_lines(lines):
    """يشتق debit_account/credit_account/account_group/amount من lines لأغراض العرض السريع في الجداول."""
    debit_lines  = [l for l in lines if l.get("side") == "debit"]
    credit_lines = [l for l in lines if l.get("side") == "credit"]
    total_debit  = sum(float(l.get("amount") or 0) for l in debit_lines)
    first_debit  = debit_lines[0] if debit_lines else None
    credit_names = " + ".join(l.get("account_name", "") for l in credit_lines) or None
    return {
        "amount": total_debit,
        "debit_account": first_debit.get("account_name") if first_debit else None,
        "account_group": first_debit.get("account_group") if first_debit else None,
        "credit_account": credit_names,
    }


def ai_suggest(description: str, amount: float, vendor: str = "", tx_type: str = "", business_type: str = "", payment_method: str = "", history_context: str = "", date: str = ""):
    client = get_claude()
    if not client:
        return {
            "lines": _fallback_lines(amount),
            "debit_account": "مصروفات عامة",
            "credit_account": "الصندوق",
            "explanation": "ANTHROPIC_API_KEY غير موجود في ملف .env أو مكتبة anthropic غير مثبّتة.",
            "account_group": "expenses",
            "confidence": "low",
            "warnings": ["المفتاح غير مهيأ — راجع القيد يدويًا قبل الحفظ"]
        }

    biz_context = f"\n- مجال نشاط المنشأة: {business_type}\n" if business_type else ""
    biz_note = (
        f"مهم: راعِ طبيعة نشاط المنشأة ({business_type}) عند اختيار أسماء الحسابات."
        if business_type else ""
    )
    payment_note = (
        f"\n- طريقة السداد المحدَّدة صراحةً من المحاسب: {payment_method} — استخدمها لتحديد الحساب الدائن مباشرة.\n"
        if payment_method else
        "\n- طريقة السداد غير محدَّدة صراحةً — استنتجها من الوصف إن أمكن، وإلا استخدم الأقرب منطقيًا واذكر ذلك في warnings.\n"
    )
    date_note = f"\n- تاريخ المعاملة الذي حدَّده المحاسب: {date} — هذا التاريخ مؤكَّد، لا تعتبره غير محدَّد ولا تُنقص الثقة بسببه.\n" if date else ""
    prompt = f"""{EXPERT_PERSONA}

حلّل هذه المعاملة وسجّلها عبر أداة record_journal_entry:
- الوصف: {description}
- المبلغ الإجمالي: {amount} ريال
- المورد/العميل: {vendor or 'غير محدد'}
- النوع: {tx_type or 'غير محدد'}{biz_context}{payment_note}{date_note}
{biz_note}

{ACCOUNT_GROUP_RULES}
{history_context}"""

    try:
        result = _call_claude_tool(client, prompt, JOURNAL_ENTRY_TOOL, max_tokens=1500)
        if not result.get("lines"):
            result["lines"] = _fallback_lines(
                amount,
                credit_group=infer_account_group(None, "assets"),
            )
        derived = _derive_legacy_fields_from_lines(result["lines"])
        result["debit_account"] = derived["debit_account"]
        result["credit_account"] = derived["credit_account"]
        result["account_group"] = derived["account_group"]
        return result
    except Exception as e:
        friendly = _friendly_ai_error(e)
        return {
            "lines": _fallback_lines(amount),
            "debit_account": "مصروفات عامة",
            "credit_account": "الصندوق",
            "account_group": "expenses",
            "explanation": f"{friendly} تم اقتراح قيد افتراضي، راجع البنود يدويًا قبل الحفظ.",
            "confidence": "low",
            "warnings": [friendly]
        }


def ai_analyze_invoice(image_base64: str, media_type: str = "image/jpeg", business_type: str = "", payment_method: str = "", history_context: str = ""):
    client = get_claude()
    if not client:
        return {"error": "ANTHROPIC_API_KEY غير موجود"}
    biz_context = f"\nمجال نشاط المنشأة: {business_type}\n" if business_type else ""
    payment_hint = (
        f"\nملاحظة: حدّد المحاسب طريقة الدفع صراحةً: {payment_method}. استخدمها لتحديد الحساب الدائن ولا تسأل عنها.\n"
        if payment_method else ""
    )

    prompt = f"""{EXPERT_PERSONA}

حلّل هذه الفاتورة وسجّلها عبر أداة record_invoice_entry.
{biz_context}{payment_hint}
{ACCOUNT_GROUP_RULES}
{history_context}
قاعدة مهمة جدًا (صفر أخطاء): إن لم تكن طريقة السداد (نقدًا/تحويل بنكي/آجل) واضحة
بشكل مؤكد من الفاتورة نفسها، ولم يحدّدها المحاسب أعلاه — لا تخمّنها إطلاقًا. بدلاً
من ذلك اجعل needs_clarification=true واملأ clarification_question بسؤال مختصر
وواضح، ولا ترسل lines في هذه الحالة.

أما إذا كانت طريقة الدفع واضحة (من الفاتورة أو من تحديد المحاسب أعلاه)، اجعل
needs_clarification=false وأرسل بيانات الفاتورة كاملة مع lines لقيد متوازن."""

    try:
        result = _call_claude_tool(
            client,
            [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
                {"type": "text", "text": prompt},
            ],
            INVOICE_ENTRY_TOOL,
            max_tokens=1800,
        )
        if result.get("needs_clarification"):
            return result
        if not result.get("lines") and result.get("amount"):
            result["lines"] = _fallback_lines(result["amount"])
        if result.get("lines"):
            derived = _derive_legacy_fields_from_lines(result["lines"])
            result["debit_account"] = derived["debit_account"]
            result["credit_account"] = derived["credit_account"]
            result["account_group"] = derived["account_group"]
        return result
    except Exception as e:
        return {"error": _friendly_ai_error(e)}


def ai_quick_add(text_in: str, business_type: str = "", history_context: str = ""):
    """
    يحوّل جملة حرة مكتوبة بلغة طبيعية (مثال: "اشتريت سيارة بمبلغ 100 ألف، دفعت
    50 ألف كاش والباقي آجل") إلى قيد محاسبي مزدوج كامل — قد يتضمن أكثر من بندين
    إن كانت العملية مركّبة — جاهز للمراجعة قبل الحفظ.
    """
    client = get_claude()
    if not client:
        return {"error": "ANTHROPIC_API_KEY غير موجود في ملف .env أو مكتبة anthropic غير مثبّتة."}

    today = datetime.date.today().isoformat()
    biz_context = f"\nمجال نشاط المنشأة: {business_type} (راعِ هذا عند اختيار أسماء الحسابات)\n" if business_type else ""
    prompt = f"""{EXPERT_PERSONA}

حوّل الجملة التالية إلى قيد محاسبي مزدوج كامل عبر أداة record_journal_entry.

نص المستخدم: "{text_in}"
تاريخ اليوم: {today}{biz_context}

{ACCOUNT_GROUP_RULES}

قواعد إضافية:
- إن ذُكر أن المبلغ "شامل الضريبة"، احسب المبلغ الأساسي والضريبة بافتراض ضريبة قيمة
  مضافة 15% ما لم يُذكر خلاف ذلك، وأضف الضريبة كبند منفصل إن كانت جوهرية، أو أدمجها
  في بند الأصل/المصروف مع ذكر ذلك في الشرح.
- إذا ذُكر "نقدًا" أو "كاش" لكل المبلغ أو جزء منه → بند دائن على "الصندوق" (assets).
- إذا ذُكر "تحويل" أو "بنك" → بند دائن على "البنك" (assets).
- إذا ذُكر "آجل" أو "على الحساب" أو "كمبيالة" لكل المبلغ أو جزء منه → بند دائن على
  حساب دائن مناسب (مثل "حسابات دائنة" أو "أوراق الدفع") ضمن liabilities.
{history_context}"""

    try:
        result = _call_claude_tool(client, prompt, JOURNAL_ENTRY_TOOL, max_tokens=1500)
        if not result.get("lines"):
            return {"error": "تعذّر على الذكاء الاصطناعي إنشاء قيد متوازن من هذا النص. حاول صياغته بوضوح أكبر."}
        derived = _derive_legacy_fields_from_lines(result["lines"])
        result["debit_account"] = derived["debit_account"]
        result["credit_account"] = derived["credit_account"]
        result["account_group"] = derived["account_group"]
        return result
    except Exception as e:
        return {"error": _friendly_ai_error(e)}


# ── Chat endpoint للـ Frontend ─────────────────────────────────────
class ChatRequest(BaseModel):
    system:   str
    messages: list

def _extract_text(response):
    """
    يستخرج النص الفعلي من رد Claude بأمان — لا يفترض أن أول بند في المحتوى
    نص دائمًا، لأن بعض النماذج قد تُرجع بندًا من نوع "تفكير" (ThinkingBlock)
    قبل النص الفعلي، وهو ما كان يسبب خطأ AttributeError سابقًا.
    """
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""


@router.post("/api/chat")
def chat_with_claude(data: ChatRequest):
    client = get_claude()
    if not client:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY غير موجود")
    try:
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1000,
            system=data.system,
            messages=data.messages
        )
        return {"content": _extract_text(response)}
    except Exception as e:
        raise HTTPException(status_code=503, detail=_friendly_ai_error(e))


# ── Schemas ───────────────────────────────────────────────────────
class TransactionLineIn(BaseModel):
    account_name:  str
    account_group: str
    side:          str      # 'debit' أو 'credit'
    amount:        float

class TransactionCreate(BaseModel):
    description:     str
    amount:          Optional[float] = None   # اختياري إن أُرسلت lines — يُحسب من مجموع بنود المدين
    vendor:          Optional[str]   = None
    date:            Optional[str]   = None
    tax_amount:      Optional[float] = 0
    debit_account:   Optional[str]   = None
    credit_account:  Optional[str]   = None
    ai_suggestion:   Optional[str]   = None
    tx_type:         Optional[str]   = "journal"
    account_group:   Optional[str]   = None
    is_approved:     Optional[bool]  = False
    is_ai_generated: Optional[bool]  = False
    is_reviewed:     Optional[bool]  = False
    party_name:      Optional[str]   = None
    party_type:      Optional[str]   = None
    due_date:        Optional[str]   = None
    is_paid:         Optional[bool]  = True
    lines:           Optional[List[TransactionLineIn]] = None
    invoice_url:     Optional[str]   = None  # رابط ملف مرفق (فاتورة/مستند) إن وُجد

class TransactionUpdate(BaseModel):
    description:    Optional[str]   = None
    amount:         Optional[float] = None
    vendor:         Optional[str]   = None
    date:           Optional[str]   = None
    tax_amount:     Optional[float] = None
    debit_account:  Optional[str]   = None
    credit_account: Optional[str]   = None
    ai_suggestion:  Optional[str]   = None
    tx_type:        Optional[str]   = None
    account_group:  Optional[str]   = None
    is_approved:    Optional[bool]  = None
    is_reviewed:    Optional[bool]  = None
    party_name:     Optional[str]   = None
    party_type:     Optional[str]   = None
    due_date:       Optional[str]   = None
    is_paid:        Optional[bool]  = None
    lines:          Optional[List[TransactionLineIn]] = None
    invoice_url:    Optional[str]   = None
    # ملاحظة: is_ai_generated ليس ضمن حقول التعديل عن قصد — علامة "أنشأه AI" دائمة
    # ولا تُزال بالتعديل، حتى لو غيّر المحاسب كل تفاصيل القيد لاحقًا.

class SuggestRequest(BaseModel):
    description: str
    amount:      float
    vendor:      Optional[str] = None
    tx_type:     Optional[str] = None
    business_type: Optional[str] = None
    payment_method: Optional[str] = None
    date:        Optional[str] = None

class QuickAddRequest(BaseModel):
    text: str
    business_type: Optional[str] = None


# ── Audit trail helper ───────────────────────────────────────────
def log_audit(db, tx_id, action, field_name=None, old_value=None, new_value=None, user=None, actor_override=None):
    entry = models.TransactionAuditLog(
        transaction_id=tx_id,
        action=action,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        changed_by_id=user.id if user else None,
        changed_by_name=actor_override or (user.name if user else "النظام"),
    )
    db.add(entry)


def _validate_and_normalize_lines(lines_in):
    if not lines_in:
        return None, None
    total_debit  = sum(l.amount for l in lines_in if l.side == "debit")
    total_credit = sum(l.amount for l in lines_in if l.side == "credit")
    if total_debit <= 0:
        raise HTTPException(status_code=400, detail="القيد يجب أن يحتوي على بند مدين واحد على الأقل بمبلغ أكبر من صفر")
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"القيد غير متوازن: مجموع المدين {total_debit:.2f} لا يساوي مجموع الدائن {total_credit:.2f}"
        )
    return total_debit, total_credit


def _replace_lines(db, tx_id, lines_in):
    db.query(models.TransactionLine).filter(models.TransactionLine.transaction_id == tx_id).delete()
    for idx, l in enumerate(lines_in):
        db.add(models.TransactionLine(
            transaction_id=tx_id, account_name=l.account_name, account_group=l.account_group,
            side=l.side, amount=l.amount, line_order=idx,
        ))


def serialize_tx(tx):
    """نبني قاموسًا صريحًا يتضمن أعمدة الجدول + بنود القيد (lines)، لأن العلاقات
    (relationships) لا تظهر تلقائيًا عند إرجاع كائن SQLAlchemy مباشرة."""
    data = {c.name: getattr(tx, c.name) for c in models.Transaction.__table__.columns}
    data["lines"] = [
        {"id": l.id, "account_name": l.account_name, "account_group": l.account_group,
         "side": l.side, "amount": l.amount}
        for l in tx.lines
    ]
    return data


# ── Endpoints: Transactions CRUD ───────────────────────────────────
@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    # نرتّب حسب id تنازليًا بدل created_at: id متسلسل دائمًا بترتيب الإدخال،
    # بينما created_at قد يتطابق لدقّة الثانية عند إدخال أكثر من قيد بسرعة
    # فيضطرب الترتيب ولا تظهر أحدث المعاملات فعليًا في الأعلى.
    txs = db.query(models.Transaction).order_by(models.Transaction.id.desc()).all()
    return [serialize_tx(tx) for tx in txs]

@router.get("/transactions/{tx_id}")
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    return serialize_tx(tx)

@router.get("/transactions/{tx_id}/audit-log")
def get_transaction_audit_log(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    return db.query(models.TransactionAuditLog).filter(
        models.TransactionAuditLog.transaction_id == tx_id
    ).order_by(models.TransactionAuditLog.changed_at.asc()).all()

@router.post("/transactions")
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    lines_in = data.lines or []
    _validate_and_normalize_lines(lines_in)

    if data.is_reviewed and not data.is_approved:
        raise HTTPException(status_code=400, detail="يجب اعتماد القيد أولاً قبل تحديد المراجعة")

    if lines_in:
        derived = _derive_legacy_fields_from_lines([l.model_dump() for l in lines_in])
        final_amount         = derived["amount"]
        final_debit_account  = derived["debit_account"] or data.debit_account
        final_credit_account = derived["credit_account"] or data.credit_account
        final_account_group  = derived["account_group"] or data.account_group
    else:
        final_amount         = data.amount or 0
        final_debit_account  = data.debit_account
        final_credit_account = data.credit_account
        final_account_group  = data.account_group or infer_account_group(data.debit_account)

    tx = models.Transaction(
        description=data.description,
        amount=final_amount,
        vendor=data.vendor,
        date=datetime.datetime.strptime(data.date, "%Y-%m-%d") if data.date else datetime.datetime.utcnow(),
        tax_amount=data.tax_amount,
        debit_account=final_debit_account,
        credit_account=final_credit_account,
        ai_suggestion=data.ai_suggestion,
        tx_type=data.tx_type,
        account_group=final_account_group,
        is_approved=data.is_approved,
        status="approved" if data.is_approved else "pending",
        created_by_id=current_user.id if current_user else None,
        user_id=current_user.id if current_user else None,
        is_ai_generated=bool(data.is_ai_generated),
        is_reviewed=bool(data.is_reviewed),
        reviewed_by_id=current_user.id if (current_user and data.is_reviewed) else None,
        party_name=data.party_name,
        party_type=data.party_type,
        due_date=datetime.datetime.strptime(data.due_date, "%Y-%m-%d") if data.due_date else None,
        is_paid=data.is_paid if data.is_paid is not None else True,
        invoice_url=data.invoice_url,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    tx.entry_number = f"JE-{tx.id:06d}"
    db.add(tx)

    if lines_in:
        _replace_lines(db, tx.id, lines_in)
    else:
        # قيد بسيط تقليدي (بدون بنود صريحة) — نبني سطرين تلقائيًا حتى تبقى بنية
        # البيانات موحّدة، مع استدلال مجموعة الحساب الدائن بدل تكرار نفس مجموعة
        # الحساب المدين (وهو جوهر إصلاح ازدواجية القيد المطلوب).
        if final_debit_account:
            db.add(models.TransactionLine(
                transaction_id=tx.id, account_name=final_debit_account,
                account_group=final_account_group or "expenses", side="debit",
                amount=final_amount, line_order=0,
            ))
        if final_credit_account:
            db.add(models.TransactionLine(
                transaction_id=tx.id, account_name=final_credit_account,
                account_group=infer_account_group(final_credit_account, "assets"), side="credit",
                amount=final_amount, line_order=1,
            ))

    db.commit()
    creation_actor = None if current_user else ("الذكاء الاصطناعي" if data.is_ai_generated else None)
    log_audit(db, tx.id, "created", new_value=tx.description, user=current_user, actor_override=creation_actor)
    db.commit()
    db.refresh(tx)
    return serialize_tx(tx)

@router.put("/transactions/{tx_id}")
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")

    changes = data.model_dump(exclude_none=True, exclude={"lines"})

    # لا يمكن تحديد "مُراجَع" قبل الاعتماد — سواء الاعتماد سابقًا أو ضمن نفس الطلب
    if changes.get("is_reviewed") is True:
        final_approved = changes.get("is_approved", tx.is_approved)
        if not final_approved:
            raise HTTPException(status_code=400, detail="يجب اعتماد القيد أولاً قبل تحديد المراجعة")

    for field, value in changes.items():
        if field in ("date", "due_date") and value:
            value = datetime.datetime.strptime(value, "%Y-%m-%d")
        old_value = getattr(tx, field, None)
        if old_value != value:
            log_audit(db, tx.id, "updated", field_name=field, old_value=old_value, new_value=value, user=current_user)
        setattr(tx, field, value)

    if data.lines:
        _validate_and_normalize_lines(data.lines)
        old_lines_desc = ", ".join(f"{l.side}:{l.account_name}:{l.amount}" for l in tx.lines)
        _replace_lines(db, tx.id, data.lines)
        derived = _derive_legacy_fields_from_lines([l.model_dump() for l in data.lines])
        tx.amount         = derived["amount"]
        tx.debit_account  = derived["debit_account"] or tx.debit_account
        tx.credit_account = derived["credit_account"] or tx.credit_account
        tx.account_group  = derived["account_group"] or tx.account_group
        new_lines_desc = ", ".join(f"{l.side}:{l.account_name}:{l.amount}" for l in data.lines)
        log_audit(db, tx.id, "updated", field_name="lines", old_value=old_lines_desc, new_value=new_lines_desc, user=current_user)

    if "is_approved" in changes:
        tx.status = "approved" if changes["is_approved"] else "pending"
    if "is_reviewed" in changes and changes["is_reviewed"] and current_user:
        tx.reviewed_by_id = current_user.id

    db.commit()
    db.refresh(tx)
    return serialize_tx(tx)

@router.patch("/transactions/{tx_id}/approve")
def approve_transaction(
    tx_id: int,
    approved: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """يبدّل حالة الاعتماد فقط — مستقل تمامًا عن حالة المراجعة."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    old = tx.is_approved
    tx.is_approved = approved
    tx.status = "approved" if approved else "pending"
    log_audit(db, tx.id, "approved" if approved else "unapproved",
              field_name="is_approved", old_value=old, new_value=approved, user=current_user)
    db.commit()
    db.refresh(tx)
    return serialize_tx(tx)

@router.patch("/transactions/{tx_id}/review")
def review_transaction(
    tx_id: int,
    reviewed: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """يبدّل حالة المراجعة فقط. لا يمكن تحديد قيد كـ"مُراجَع" قبل اعتماده أولاً."""
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    if reviewed and not tx.is_approved:
        raise HTTPException(status_code=400, detail="يجب اعتماد القيد أولاً قبل تحديد المراجعة")
    old = tx.is_reviewed
    tx.is_reviewed = reviewed
    tx.reviewed_by_id = current_user.id if (current_user and reviewed) else tx.reviewed_by_id
    log_audit(db, tx.id, "reviewed" if reviewed else "unreviewed",
              field_name="is_reviewed", old_value=old, new_value=reviewed, user=current_user)
    db.commit()
    db.refresh(tx)
    return serialize_tx(tx)

@router.delete("/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="المعاملة غير موجودة")
    db.delete(tx)
    db.commit()
    return {"message": "تم الحذف"}


def _get_recent_examples(db, limit=6):
    """
    يجلب أمثلة من آخر القيود المعتمدة فعليًا في هذا النظام، ليحافظ الذكاء
    الاصطناعي على نفس أسماء الحسابات ونمط التصنيف المعتاد لدى هذه المنشأة
    تحديدًا بدل تصنيف عام قد يختلف من مرة لأخرى لنفس نوع العملية.
    """
    recent = (
        db.query(models.Transaction)
        .filter(models.Transaction.is_approved == True)  # noqa: E712
        .order_by(models.Transaction.id.desc())
        .limit(limit)
        .all()
    )
    lines_txt = []
    for tx in recent:
        parts = [f'"{l.account_name}" ({l.account_group}, {l.side})' for l in tx.lines]
        if parts:
            lines_txt.append(f'- "{tx.description}" → ' + " | ".join(parts))
    if not lines_txt:
        return ""
    return (
        "\nأمثلة من قيود سابقة معتمدة فعليًا في نظام هذه المنشأة (التزم بنفس "
        "أسماء الحسابات ونمط التصنيف إن كانت الحالة الحالية مشابهة لإحداها،"
        " لضمان الاتساق):\n" + "\n".join(lines_txt) + "\n"
    )


# ── Endpoints: AI ────────────────────────────────────────────────
@router.post("/api/suggest-entry")
def suggest_entry(data: SuggestRequest, db: Session = Depends(get_db)):
    return ai_suggest(
        description=data.description,
        amount=data.amount,
        vendor=data.vendor or "",
        tx_type=data.tx_type or "",
        business_type=data.business_type or "",
        payment_method=data.payment_method or "",
        history_context=_get_recent_examples(db),
        date=data.date or "",
    )

@router.post("/api/quick-add")
def quick_add(data: QuickAddRequest, db: Session = Depends(get_db)):
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=400, detail="أدخل نص المعاملة أولاً")
    result = ai_quick_add(data.text.strip(), business_type=data.business_type or "", history_context=_get_recent_examples(db))
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
ALLOWED_ATTACHMENT_TYPES = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf",
}

@router.post("/api/upload-file")
async def upload_file(file: UploadFile = File(...)):
    """
    يرفع أي ملف مرفق (فاتورة، مستند مساند) ويحفظه محليًا كمرجع للقيد — إلى حين
    ربط النظام بتخزين حقيقي لاحقًا. يعيد رابطًا نسبيًا يُخزَّن في حقل invoice_url
    للمعاملة، ويمكن استخدامه لعرض/تنزيل الملف لاحقًا.
    """
    ext = ALLOWED_ATTACHMENT_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="يُقبل: JPG, PNG, WEBP, PDF فقط")
    contents = await file.read()
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="الحد الأقصى لحجم الملف 8MB")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(contents)
    return {"url": f"/uploads/{unique_name}", "filename": file.filename}


@router.post("/api/analyze-invoice")
async def analyze_invoice(
    file: UploadFile = File(...),
    business_type: str = Form(default=""),
    payment_method: str = Form(default=""),
    db: Session = Depends(get_db),
):
    allowed = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="يُقبل: JPG, PNG, WEBP فقط")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="الحد الأقصى 5MB")

    # نحفظ الفاتورة الأصلية كمرجع دائم مرتبط بالقيد — حتى لو احتاج المحاسب
    # الرجوع للصورة الأصلية لاحقًا للتأكد من تفاصيلها.
    ext = ALLOWED_ATTACHMENT_TYPES.get(file.content_type, ".jpg")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOADS_DIR, unique_name), "wb") as f:
        f.write(contents)
    invoice_url = f"/uploads/{unique_name}"

    image_b64 = base64.b64encode(contents).decode("utf-8")
    result = ai_analyze_invoice(
        image_b64, file.content_type, business_type=business_type,
        payment_method=payment_method, history_context=_get_recent_examples(db),
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    result["invoice_url"] = invoice_url
    return result


# ── Endpoints: الذمم المدينة والدائنة ───────────────────────────────
@router.get("/api/ar-ap-summary")
def ar_ap_summary(db: Session = Depends(get_db)):
    # قاعدة الترحيل: القيد غير المعتمد لا يُرحَّل، فلا يُحتسب ضمن الذمم حتى يُعتمد.
    receivable = db.query(models.Transaction).filter(
        models.Transaction.party_type == "customer",
        models.Transaction.is_paid == False,  # noqa: E712
        models.Transaction.is_approved == True,  # noqa: E712
    ).all()
    payable = db.query(models.Transaction).filter(
        models.Transaction.party_type == "vendor",
        models.Transaction.is_paid == False,  # noqa: E712
        models.Transaction.is_approved == True,  # noqa: E712
    ).all()
    return {
        "receivable_total": sum(t.amount or 0 for t in receivable),
        "receivable_count": len(receivable),
        "payable_total": sum(t.amount or 0 for t in payable),
        "payable_count": len(payable),
    }


# ── حساب الأستاذ (Ledger): نفس منطق الواجهة الأمامية بالضبط، بايثونيًا ──
NORMAL_SIDE = {
    "assets": "debit", "expenses": "debit", "cogs": "debit",
    "liabilities": "credit", "equity": "credit", "revenue": "credit",
}
GROUP_LABELS_AR = {
    "assets": "الأصول", "liabilities": "الالتزامات", "equity": "حقوق الملكية",
    "revenue": "الإيرادات", "cogs": "تكلفة المبيعات", "expenses": "المصروفات",
}


def _compute_ledger(db):
    """
    يحسب إجمالي كل مجموعة حساب وتفصيل كل حساب داخلها — من القيود المعتمدة
    فقط (قاعدة الترحيل: غير المعتمد لا يُرحَّل ولا يدخل في أي تقرير).
    """
    posted = db.query(models.Transaction).filter(models.Transaction.is_approved == True).all()  # noqa: E712
    totals = {g: 0.0 for g in NORMAL_SIDE}
    breakdown = {g: {} for g in NORMAL_SIDE}

    for tx in posted:
        if tx.lines:
            for line in tx.lines:
                g = line.account_group
                if g not in totals:
                    continue
                sign = 1 if NORMAL_SIDE[g] == line.side else -1
                totals[g] += sign * (line.amount or 0)
                key = line.account_name or "أخرى"
                breakdown[g][key] = breakdown[g].get(key, 0) + sign * (line.amount or 0)
        else:
            g = tx.account_group or "expenses"
            if g not in totals:
                continue
            totals[g] += tx.amount or 0
            key = (tx.credit_account if g == "revenue" else tx.debit_account) or tx.description or "أخرى"
            breakdown[g][key] = breakdown[g].get(key, 0) + (tx.amount or 0)

    breakdown_arr = {
        g: sorted(
            [{"name": n, "value": v} for n, v in items.items() if abs(v) > 0.005],
            key=lambda x: -abs(x["value"]),
        )
        for g, items in breakdown.items()
    }
    return totals, breakdown_arr, posted


def _pdf_response(buf, filename):
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Endpoints: تصدير PDF ───────────────────────────────────────────
@router.get("/api/reports/income-statement/pdf")
def export_income_statement_pdf(db: Session = Depends(get_db)):
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="ميزة تصدير PDF غير مفعّلة على الخادم (مكتبات ناقصة)")
    totals, breakdown, _ = _compute_ledger(db)
    gross_profit = totals["revenue"] - totals["cogs"]
    net_profit = gross_profit - totals["expenses"]
    buf = pdf_utils.build_income_statement_pdf(totals, breakdown, gross_profit, net_profit)
    return _pdf_response(buf, "income_statement.pdf")


@router.get("/api/reports/balance-sheet/pdf")
def export_balance_sheet_pdf(db: Session = Depends(get_db)):
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="ميزة تصدير PDF غير مفعّلة على الخادم (مكتبات ناقصة)")
    totals, breakdown, _ = _compute_ledger(db)
    buf = pdf_utils.build_balance_sheet_pdf(totals, breakdown)
    return _pdf_response(buf, "balance_sheet.pdf")


@router.get("/api/reports/account-statement/pdf")
def export_account_statement_pdf(group: str, db: Session = Depends(get_db)):
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="ميزة تصدير PDF غير مفعّلة على الخادم (مكتبات ناقصة)")
    if group not in NORMAL_SIDE:
        raise HTTPException(status_code=400, detail="مجموعة حساب غير معروفة")
    totals, breakdown, posted = _compute_ledger(db)

    tx_rows = []
    for tx in posted:
        touches = (
            any(l.account_group == group for l in tx.lines) if tx.lines
            else (tx.account_group or "expenses") == group
        )
        if touches:
            tx_rows.append({
                "entry_number": tx.entry_number or f"#{tx.id}",
                "description": tx.description or "",
                "date": tx.date.strftime("%Y-%m-%d") if tx.date else "",
                "amount": tx.amount or 0,
            })
    tx_rows.sort(key=lambda r: r["date"], reverse=True)

    buf = pdf_utils.build_account_statement_pdf(GROUP_LABELS_AR[group], breakdown[group], totals[group], tx_rows)
    return _pdf_response(buf, f"account_statement_{group}.pdf")