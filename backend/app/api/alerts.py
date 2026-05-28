from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from app.deps import get_current_user_demo as auth
from app.db.supabase_client import supabase_admin

router = APIRouter()

class AckRequest(BaseModel):
    alert_id: int
    acknowledged_by: str

@router.post("/alerts/acknowledged")
async def acknowledged_alert(req: AckRequest, user=Depends(auth)):
    r = (
        supabase_admin.table("alert")
        .update({
            "acknowledged":    True,
            "acknowledged_by": req.acknowledged_by,
            "acknowledged_at": datetime.now().isoformat(),
        })
        .eq("id", req.alert_id)
        .execute()
    )

    if not r.data:
        raise HTTPException(404, "Alert tidak ditemukan")
    return {"success": True, "alert": r.data[0]}

@router.get("/alerts/active")
async def get_active_alerts(limit: int = 50,user=Depends(auth)):
    r = (
        supabase_admin.table("alerts")
        .select("*")
        .eq("acknowledged", False)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"alerts": r.data, "count": len(r.data)}