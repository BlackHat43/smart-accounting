from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role            = Column(String, default="accountant")
    created_at      = Column(DateTime, default=datetime.datetime.utcnow)
    transactions    = relationship(
        "Transaction", back_populates="user", foreign_keys="Transaction.user_id"
    )


class Transaction(Base):
    __tablename__ = "transactions"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    date           = Column(DateTime, default=datetime.datetime.utcnow)
    description    = Column(String, nullable=False)
    amount         = Column(Float, nullable=False)
    vendor         = Column(String, nullable=True)
    tax_amount     = Column(Float, default=0)
    debit_account  = Column(String, nullable=True)
    credit_account = Column(String, nullable=True)
    ai_suggestion  = Column(Text, nullable=True)        # شرح AI
    ai_confidence  = Column(String, nullable=True)       # high / medium / low
    ai_warnings    = Column(Text, nullable=True)         # تحذيرات AI (JSON string)
    tx_type        = Column(String, default="journal")   # invoice / expense / journal / payment
    account_group  = Column(String, nullable=True)       # assets / liabilities / equity / revenue / cogs / expenses
    is_approved    = Column(Boolean, default=False)
    invoice_url    = Column(String, nullable=True)       # رابط الفاتورة المرفوعة
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)

    # ── تتبّع القيد (رقم القيد / حالته / منشئه / مراجعته) ──────────────
    entry_number    = Column(String, nullable=True, index=True)   # مثال: JE-000123
    status          = Column(String, default="pending")           # pending / approved / rejected
    created_by_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    is_reviewed     = Column(Boolean, default=False)
    reviewed_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ── الذمم المدينة/الدائنة وتنبيهات الاستحقاق ───────────────────────
    party_name = Column(String, nullable=True)   # اسم العميل أو المورد
    party_type = Column(String, nullable=True)   # customer / vendor
    due_date   = Column(DateTime, nullable=True)
    is_paid    = Column(Boolean, default=True)

    user        = relationship("User", back_populates="transactions", foreign_keys=[user_id])
    created_by  = relationship("User", foreign_keys=[created_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    audit_logs  = relationship(
        "TransactionAuditLog",
        back_populates="transaction",
        cascade="all, delete-orphan",
        order_by="TransactionAuditLog.changed_at",
    )
    lines = relationship(
        "TransactionLine",
        back_populates="transaction",
        cascade="all, delete-orphan",
        order_by="TransactionLine.line_order",
    )


class TransactionLine(Base):
    """
    بند من بنود القيد المحاسبي الحقيقي (Double-Entry).
    القيد الواحد قد يمس أكثر من حساب/مجموعة: مثال شراء سيارة بـ 100,000 نصفها نقدًا
    ونصفها آجل ينتج عنه 3 بنود: مدين السيارة (أصول) 100,000، دائن الصندوق (أصول) 50,000،
    دائن أوراق الدفع (التزامات) 50,000 — بحيث يبقى مجموع المدين = مجموع الدائن دائمًا.
    """
    __tablename__ = "transaction_lines"
    id             = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    account_name   = Column(String, nullable=False)
    account_group  = Column(String, nullable=False)   # assets/liabilities/equity/revenue/cogs/expenses
    side           = Column(String, nullable=False)    # debit / credit
    amount         = Column(Float, nullable=False)
    line_order     = Column(Integer, default=0)

    transaction = relationship("Transaction", back_populates="lines")


class TransactionAuditLog(Base):
    """سجل تعديلات (Audit Trail) لكل قيد — من غيّر، متى، وأي حقل."""
    __tablename__ = "transaction_audit_logs"
    id              = Column(Integer, primary_key=True, index=True)
    transaction_id  = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    action          = Column(String, nullable=False)   # created / updated / approved / unapproved
    field_name      = Column(String, nullable=True)
    old_value       = Column(String, nullable=True)
    new_value       = Column(String, nullable=True)
    changed_by_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_by_name = Column(String, nullable=True)     # نسخة نصية تبقى حتى لو حُذف المستخدم لاحقًا
    changed_at      = Column(DateTime, default=datetime.datetime.utcnow)

    transaction = relationship("Transaction", back_populates="audit_logs")