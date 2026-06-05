"""apps/support/views.py"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone

from apps.support.models import SupportTicket, TicketStatus
from apps.accounts.permissions import IsAdminOrAbove, get_request_branch_id


def ok(data=None, code=status.HTTP_200_OK):
    return Response({"success": True, **(data or {})}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)


class SubmitTicketView(APIView):
    """
    POST /api/v1/support/submit/
    Any visitor (authenticated or not) can submit a support ticket.
    Accepts multipart/form-data for photo upload.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        name    = request.data.get("name", "").strip()
        email   = request.data.get("email", "").strip()
        phone   = request.data.get("phone", "").strip()
        subject = request.data.get("subject", "").strip()
        message = request.data.get("message", "").strip()
        photo   = request.FILES.get("photo")

        if not name:    return err("Name is required.")
        if not email:   return err("Email is required.")
        if not subject: return err("Subject is required.")
        if not message: return err("Message is required.")

        # Resolve branch from query param or stored branch_id
        branch = None
        bid = request.data.get("branch_id") or request.query_params.get("branch_id")
        if bid:
            try:
                from apps.branches.models import Branch
                branch = Branch.objects.get(id=bid)
            except Exception:
                pass

        customer = request.user if request.user.is_authenticated else None

        ticket = SupportTicket.objects.create(
            customer=customer,
            branch=branch,
            name=name, email=email, phone=phone,
            subject=subject, message=message,
            photo=photo,
        )

        # Send confirmation email to customer
        _send_confirmation_email(ticket)

        return ok({"ticket_id": str(ticket.id), "message": "Your message has been received. We'll respond within 24 hours."}, code=status.HTTP_201_CREATED)


class AdminTicketListView(APIView):
    """
    GET /api/v1/support/tickets/
    BranchAdmin sees own branch tickets. SuperAdmin sees all (optionally filter by branch_id).
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.models import Role
        qs = SupportTicket.objects.select_related("customer", "branch", "replied_by")

        if request.user.role == Role.BRANCH_ADMIN:
            bid = get_request_branch_id(request)
            qs = qs.filter(branch_id=bid)
        else:
            bid = request.query_params.get("branch_id")
            if bid:
                qs = qs.filter(branch_id=bid)

        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)

        data = []
        for t in qs[:100]:
            data.append({
                "id":           str(t.id),
                "name":         t.name,
                "email":        t.email,
                "phone":        t.phone,
                "subject":      t.subject,
                "message":      t.message,
                "photo_url":    request.build_absolute_uri(t.photo.url) if t.photo else None,
                "status":       t.status,
                "branch":       t.branch.name if t.branch else "—",
                "branch_id":    str(t.branch_id) if t.branch_id else None,
                "admin_reply":  t.admin_reply,
                "replied_by":   t.replied_by.name if t.replied_by else None,
                "replied_at":   t.replied_at.isoformat() if t.replied_at else None,
                "created_at":   t.created_at.isoformat(),
            })

        return ok({"tickets": data, "count": len(data)})


class AdminTicketDetailView(APIView):
    """
    PATCH /api/v1/support/tickets/<id>/
    Reply to ticket and/or update status.
    """
    permission_classes = [IsAuthenticated, IsAdminOrAbove]

    def patch(self, request, pk):
        try:
            ticket = SupportTicket.objects.get(id=pk)
        except SupportTicket.DoesNotExist:
            return err("Ticket not found.", 404)

        reply  = request.data.get("admin_reply", "").strip()
        new_st = request.data.get("status")

        if reply:
            ticket.admin_reply = reply
            ticket.replied_by  = request.user
            ticket.replied_at  = timezone.now()
            if not new_st:
                new_st = TicketStatus.RESOLVED

        if new_st and new_st in TicketStatus.values:
            ticket.status = new_st

        ticket.save()

        if reply:
            _send_reply_email(ticket)

        return ok({"status": ticket.status, "message": "Ticket updated."})


def _send_confirmation_email(ticket):
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        send_mail(
            subject=f"We received your message — {ticket.subject}",
            message="",
            html_message=_confirmation_html(ticket),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.email],
            fail_silently=True,
        )
    except Exception:
        pass


def _send_reply_email(ticket):
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        send_mail(
            subject=f"Response to your support request — {ticket.subject}",
            message="",
            html_message=_reply_html(ticket),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.email],
            fail_silently=True,
        )
    except Exception:
        pass


def _confirmation_html(ticket):
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'DM Sans',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <tr><td style="background:linear-gradient(135deg,#E8521A,#C43F0A);padding:32px 40px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-.02em">KNFC</div>
        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.8);letter-spacing:.1em;text-transform:uppercase;margin-top:4px">FRIED CHICKEN</div>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <p style="font-size:22px;font-weight:800;color:#0C0807;margin:0 0 8px">Hi {ticket.name},</p>
        <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px">
          Thank you for reaching out! We've received your message and our team will get back to you within <strong>24 hours</strong>.
        </p>
        <div style="background:#f9f8f6;border:1px solid #e5e0d8;border-radius:10px;padding:20px 24px;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9CA3AF;margin-bottom:8px">Your Message</div>
          <div style="font-weight:700;font-size:15px;color:#0C0807;margin-bottom:6px">{ticket.subject}</div>
          <div style="font-size:14px;color:#4B5563;line-height:1.6">{ticket.message[:300]}{'...' if len(ticket.message) > 300 else ''}</div>
        </div>
        <div style="font-size:12px;color:#9CA3AF;border-top:1px solid #f0ebe4;padding-top:20px;margin-top:8px">
          Ticket ID: <strong style="font-family:monospace;color:#6B7280">{str(ticket.id)[:8].upper()}</strong>
        </div>
      </td></tr>
      <tr><td style="background:#f9f8f6;padding:20px 40px;text-align:center;border-top:1px solid #f0ebe4">
        <p style="margin:0;font-size:13px;color:#9CA3AF">&copy; KNFC Fried Chicken. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""


def _reply_html(ticket):
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'DM Sans',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <tr><td style="background:linear-gradient(135deg,#E8521A,#C43F0A);padding:32px 40px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-.02em">KNFC</div>
        <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.8);letter-spacing:.1em;text-transform:uppercase;margin-top:4px">FRIED CHICKEN</div>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <p style="font-size:22px;font-weight:800;color:#0C0807;margin:0 0 8px">Hi {ticket.name},</p>
        <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px">
          We've responded to your support request. Here's what our team has to say:
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:10px;padding:20px 24px;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#16a34a;margin-bottom:10px">Our Response</div>
          <div style="font-size:15px;color:#15803d;line-height:1.7">{ticket.admin_reply}</div>
        </div>
        <div style="background:#f9f8f6;border:1px solid #e5e0d8;border-radius:10px;padding:16px 20px;margin-bottom:24px">
          <div style="font-size:12px;color:#9CA3AF">Your original message: <em style="color:#6B7280">{ticket.subject}</em></div>
        </div>
        <p style="font-size:14px;color:#6b7280;line-height:1.6">
          If you have further questions, you can reply to this email or submit a new support request.
        </p>
      </td></tr>
      <tr><td style="background:#f9f8f6;padding:20px 40px;text-align:center;border-top:1px solid #f0ebe4">
        <p style="margin:0;font-size:13px;color:#9CA3AF">&copy; KNFC Fried Chicken. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""
