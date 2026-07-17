from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from database import engine, Base
from routers import auth, transactions
import os

Base.metadata.create_all(bind=engine)


def run_light_migrations():
    """
    يضيف الأعمدة الجديدة إلى جدول transactions الموجود مسبقًا دون حذف أي بيانات.
    المشروع لا يستخدم Alembic، لذلك هذه خطوة ترحيل بسيطة وآمنة تُنفَّذ عند كل إقلاع
    وتتجاهل أي عمود موجود بالفعل.

    هذه الترحيلات مكتوبة بصياغة SQLite تحديدًا (أنواع وشروط تختلف عن Postgres)،
    ولا حاجة لها أصلاً على Postgres لأن create_all() ينشئ الجدول بكل أعمدته
    الصحيحة من البداية على أي قاعدة بيانات فارغة جديدة (مثل Neon الجديدة).
    """
    if engine.dialect.name != "sqlite":
        return
    inspector = inspect(engine)
    if "transactions" not in inspector.get_table_names():
        return
    existing_cols = {c["name"] for c in inspector.get_columns("transactions")}
    new_columns = {
        "entry_number":    "VARCHAR",
        "status":          "VARCHAR",
        "created_by_id":   "INTEGER",
        "is_ai_generated": "BOOLEAN DEFAULT 0",
        "is_reviewed":     "BOOLEAN DEFAULT 1",
        "reviewed_by_id":  "INTEGER",
        "party_name":      "VARCHAR",
        "party_type":      "VARCHAR",
        "due_date":        "DATETIME",
        "is_paid":         "BOOLEAN DEFAULT 1",
    }
    with engine.connect() as conn:
        for col, coltype in new_columns.items():
            if col not in existing_cols:
                conn.execute(text(f"ALTER TABLE transactions ADD COLUMN {col} {coltype}"))
        conn.commit()
        # تعبئة تلقائية للقيود القديمة حتى تظهر بشكل صحيح فورًا دون تدخل يدوي
        conn.execute(text(
            "UPDATE transactions SET status = CASE WHEN is_approved = 1 THEN 'approved' ELSE 'pending' END "
            "WHERE status IS NULL"
        ))
        conn.execute(text(
            "UPDATE transactions SET entry_number = 'JE-' || substr('000000' || id, -6, 6) "
            "WHERE entry_number IS NULL"
        ))
        conn.commit()


try:
    run_light_migrations()
except Exception as e:
    print(f"⚠️ تعذّر تشغيل الترحيل التلقائي لقاعدة البيانات: {e}")

app = FastAPI(title="Smart Accounting API — دفتر")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


if os.environ.get("VERCEL"):
    UPLOADS_DIR = "/tmp/uploads"
else:
    UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
except Exception as e:
    print(f"⚠️ تعذّر تجهيز مجلد المرفقات: {e}")

app.include_router(auth.router)
app.include_router(transactions.router)


@app.get("/")
def root():
    return {"message": "دفتر — Smart Accounting API ✅", "version": "2.2"}


@app.get("/health")
def health():
    return {"status": "ok"}