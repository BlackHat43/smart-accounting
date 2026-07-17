"""
أدوات توليد تقارير PDF جاهزة للطباعة بهوية "دفتر" البصرية، مع دعم كامل
للعربية (تشكيل الحروف + الاتجاه الصحيح) عبر arabic_reshaper و python-bidi.
"""
import os
import datetime
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
import arabic_reshaper
from bidi.algorithm import get_display

FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "NotoNaskhArabic-Regular.ttf")
FONT_NAME = "NotoArabic"
if os.path.exists(FONT_PATH) and FONT_NAME not in pdfmetrics.getRegisteredFontNames():
    pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))

PURPLE = colors.HexColor("#242165")
PURPLE_MUTED = colors.HexColor("#8578D3")
CREAM = colors.HexColor("#FDF7EB")
MUTED = colors.HexColor("#8B8378")
BORDER = colors.HexColor("#E8E2D4")
GREEN = colors.HexColor("#2E7D32")
RED = colors.HexColor("#B71C1C")


def ar(text):
    """يهيئ أي نص عربي للعرض الصحيح داخل PDF (تشكيل + ترتيب اتجاه الكتابة)."""
    if text is None:
        return ""
    text = str(text)
    return get_display(arabic_reshaper.reshape(text))


def fmt_num(n):
    try:
        n = float(n or 0)
    except (TypeError, ValueError):
        return "0.00"
    sign = "-" if n < 0 else ""
    return f"{sign}{abs(n):,.2f}"


def _base_styles():
    return {
        "brand": ParagraphStyle("brand", fontName=FONT_NAME, fontSize=13, textColor=PURPLE, alignment=1, spaceAfter=2),
        "title": ParagraphStyle("title", fontName=FONT_NAME, fontSize=19, textColor=PURPLE, alignment=1, spaceAfter=4),
        "sub":   ParagraphStyle("sub", fontName=FONT_NAME, fontSize=9.5, textColor=MUTED, alignment=1, spaceAfter=3),
        "section": ParagraphStyle("section", fontName=FONT_NAME, fontSize=13, textColor=PURPLE, alignment=2, spaceBefore=14, spaceAfter=6),
    }


def _header(elements, title, subtitle=None):
    st = _base_styles()
    elements.append(Paragraph(ar("دفتر — المحاسبة الذكية"), st["brand"]))
    elements.append(Paragraph(ar(title), st["title"]))
    if subtitle:
        elements.append(Paragraph(ar(subtitle), st["sub"]))
    elements.append(Paragraph(ar(f"تاريخ الإصدار: {datetime.date.today().isoformat()}"), st["sub"]))
    elements.append(Spacer(1, 0.5 * cm))


def _section_title(elements, text):
    st = _base_styles()
    elements.append(Paragraph(ar(text), st["section"]))


def _kv_table(elements, rows, big_last=False, sar_unit="ر.س"):
    """
    جدول (قيمة، بند) بترتيب مقلوب ليقرأ من اليمين لليسار بشكل صحيح — نضع عمود
    القيمة أولاً (يسار الصفحة) وعمود البند ثانيًا (يمين الصفحة، محاذاة يمين).
    """
    data = []
    styles = []
    for i, (label, value, opts) in enumerate(rows):
        bold = opts.get("bold", False)
        color = opts.get("color", PURPLE)
        indent = opts.get("indent", False)
        value_txt = ar(f"{fmt_num(value)} {sar_unit}") if value is not None else ""
        label_txt = ar(("   " if indent else "") + label)
        data.append([value_txt, label_txt])
        font = FONT_NAME
        styles.append(("FONTNAME", (0, i), (-1, i), font))
        styles.append(("TEXTCOLOR", (0, i), (-1, i), color))
        styles.append(("FONTSIZE", (0, i), (-1, i), 13 if bold else 10.5))
        if opts.get("border_top"):
            styles.append(("LINEABOVE", (0, i), (-1, i), 1, BORDER))
        if opts.get("border_top_thick"):
            styles.append(("LINEABOVE", (0, i), (-1, i), 1.6, PURPLE))

    t = Table(data, colWidths=[5 * cm, 10 * cm])
    t.setStyle(TableStyle(styles + [
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(t)


def build_income_statement_pdf(totals, group_breakdown, gross_profit, net_profit, sar_unit="ر.س"):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
                             leftMargin=1.5 * cm, rightMargin=1.5 * cm)
    elements = []
    _header(elements, "قائمة الدخل", "مبنية على القيود المعتمدة فقط")

    rows = [("الإيرادات", totals.get("revenue", 0), {"bold": True})]
    for item in group_breakdown.get("revenue", []):
        rows.append((item["name"], item["value"], {"indent": True}))

    if totals.get("cogs", 0):
        rows.append(("تكلفة المبيعات", -totals.get("cogs", 0), {"bold": True, "color": colors.HexColor("#8A6D00")}))
        for item in group_breakdown.get("cogs", []):
            rows.append((item["name"], -item["value"], {"indent": True}))

    rows.append(("مجمل الربح", gross_profit, {"bold": True, "border_top": True}))

    rows.append(("المصروفات التشغيلية", -totals.get("expenses", 0), {"bold": True, "color": colors.HexColor("#B8620A")}))
    for item in group_breakdown.get("expenses", []):
        rows.append((item["name"], -item["value"], {"indent": True}))

    is_profit = net_profit >= 0
    rows.append((
        "صافي الربح" if is_profit else "خسارة", net_profit,
        {"bold": True, "color": GREEN if is_profit else RED, "border_top_thick": True}
    ))

    _kv_table(elements, rows, sar_unit=sar_unit)
    doc.build(elements)
    buf.seek(0)
    return buf


def build_balance_sheet_pdf(totals, group_breakdown, sar_unit="ر.س"):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
                             leftMargin=1.5 * cm, rightMargin=1.5 * cm)
    elements = []
    _header(elements, "الميزانية العمومية", "الأصول = الالتزامات + حقوق الملكية — مبنية على القيود المعتمدة فقط")

    rows = [("الأصول", totals.get("assets", 0), {"bold": True})]
    for item in group_breakdown.get("assets", []):
        rows.append((item["name"], item["value"], {"indent": True}))

    rows.append(("الالتزامات", totals.get("liabilities", 0), {"bold": True, "border_top": True}))
    for item in group_breakdown.get("liabilities", []):
        rows.append((item["name"], item["value"], {"indent": True}))

    rows.append(("حقوق الملكية", totals.get("equity", 0), {"bold": True}))
    for item in group_breakdown.get("equity", []):
        rows.append((item["name"], item["value"], {"indent": True}))

    total_le = totals.get("liabilities", 0) + totals.get("equity", 0)
    rows.append(("الالتزامات + حقوق الملكية", total_le, {"bold": True, "border_top_thick": True}))

    _kv_table(elements, rows, sar_unit=sar_unit)

    balanced = abs(totals.get("assets", 0) - total_le) < 0.01
    st = _base_styles()
    status_style = ParagraphStyle("status", fontName=FONT_NAME, fontSize=11, alignment=1, spaceBefore=14,
                                   textColor=GREEN if balanced else colors.HexColor("#856404"))
    elements.append(Paragraph(ar("✓ ميزانية متوازنة" if balanced else "⚠ الميزانية غير متوازنة"), status_style))

    doc.build(elements)
    buf.seek(0)
    return buf


def build_account_statement_pdf(group_label, lines_data, total, tx_rows, sar_unit="ر.س"):
    """كشف حساب مفصّل لمجموعة حساب معيّنة: الإجمالي، تفصيل الحسابات، وقائمة القيود."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm,
                             leftMargin=1.5 * cm, rightMargin=1.5 * cm)
    elements = []
    _header(elements, f"كشف حساب: {group_label}", "مبني على القيود المعتمدة فقط")

    rows = [(group_label, total, {"bold": True})]
    for item in lines_data:
        rows.append((item["name"], item["value"], {"indent": True}))
    _kv_table(elements, rows, sar_unit=sar_unit)

    _section_title(elements, "سجل القيود")
    header = [ar("القيمة"), ar("الوصف"), ar("التاريخ"), ar("رقم القيد")]
    table_data = [header]
    for r in tx_rows:
        table_data.append([
            ar(f"{fmt_num(r['amount'])} {sar_unit}"),
            ar(r["description"][:40]),
            ar(r["date"]),
            ar(r["entry_number"]),
        ])
    t = Table(table_data, colWidths=[3.5 * cm, 6.5 * cm, 3 * cm, 3 * cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
    ]))
    elements.append(t)

    doc.build(elements)
    buf.seek(0)
    return buf
