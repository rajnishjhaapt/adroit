import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAdminApi } from "@/admin/common";
import { errMsg } from "@/lib/api";

const empty = { current_password: "", new_password: "", confirm: "" };

export const ChangePasswordDialog = ({ open, onClose }) => {
  const call = useAdminApi();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (f.new_password.length < 10) return toast.error("New password must be at least 10 characters");
    if (f.new_password !== f.confirm) return toast.error("New passwords do not match");
    setBusy(true);
    try {
      await call("post", "/auth/change-password", { current_password: f.current_password, new_password: f.new_password });
      toast.success("Password changed");
      setF(empty);
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="change-password-dialog">
        <DialogTitle className="font-serif text-2xl text-navy">Change Password</DialogTitle>
        {[["current_password", "Current password"], ["new_password", "New password (min. 10 characters)"], ["confirm", "Confirm new password"]].map(([k, label]) => (
          <label key={k} className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-navy">{label}</span>
            <input className="field" type="password" value={f[k]} onChange={set(k)} data-testid={`change-password-${k}`} />
          </label>
        ))}
        <div className="flex justify-end gap-3">
          <button className="btn-outline-navy" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={save} disabled={busy} data-testid="change-password-save">Save</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
