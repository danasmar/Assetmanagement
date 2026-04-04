import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Card, Badge, Btn, Input, PageHeader } from "../shared";

export default function InvestorProfile({ session, onLogout }) {
 const u = session.user;

 // Personal info form
 const [infoForm, setInfoForm] = useState({ full_name: u.full_name||"", email: u.email||"", mobile: u.mobile||"", address: u.address||"", city: u.city||"", country: u.country||"" });
 const [infoEditing, setInfoEditing] = useState(false);
 const [infoSaving, setInfoSaving] = useState(false);
 const [infoMsg, setInfoMsg] = useState("");
 const [infoErr, setInfoErr] = useState("");

 // Password form
 const [pwForm, setPwForm] = useState({ current:"", newPw:"", confirm:"" });
 const [pwMsg, setPwMsg] = useState("");
 const [pwErr, setPwErr] = useState("");
 const [pwSaving, setPwSaving] = useState(false);

 const saveInfo = async () => {
   setInfoErr(""); setInfoMsg("");
   if (!infoForm.full_name.trim()) { setInfoErr("Full name is required."); return; }
   if (!infoForm.email.trim()) { setInfoErr("Email is required."); return; }
   setInfoSaving(true);
   const { error } = await supabase.from("investors").update({
     full_name: infoForm.full_name.trim(),
     email: infoForm.email.trim(),
     mobile: infoForm.mobile.trim(),
     address: infoForm.address.trim(),
     city: infoForm.city.trim(),
     country: infoForm.country.trim(),
   }).eq("id", u.id);
   if (error) { setInfoErr("Failed to save. Please try again."); }
   else {
     // Update session user object in memory
     Object.assign(session.user, infoForm);
     setInfoMsg("Profile updated successfully.");
     setInfoEditing(false);
   }
   setInfoSaving(false);
 };

 const cancelInfo = () => {
   setInfoForm({ full_name: u.full_name||"", email: u.email||"", mobile: u.mobile||"", address: u.address||"", city: u.city||"", country: u.country||"" });
   setInfoEditing(false);
   setInfoErr(""); setInfoMsg("");
 };

 const updatePassword = async () => {
   setPwErr(""); setPwMsg("");
   if (pwForm.newPw.length < 6) { setPwErr("Password must be at least 6 characters."); return; }
   if (pwForm.newPw !== pwForm.confirm) { setPwErr("Passwords do not match."); return; }
   if (pwForm.current !== session.user.password) { setPwErr("Current password is incorrect."); return; }
   setPwSaving(true);
   await supabase.from("investors").update({ password: pwForm.newPw }).eq("id", u.id);
   session.user.password = pwForm.newPw;
   setPwMsg("Password updated successfully.");
   setPwForm({ current:"", newPw:"", confirm:"" });
   setPwSaving(false);
 };

 const field = (label, key, type="text", readOnly=false) => (
   <div style={{ marginBottom:"1rem" }}>
     <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>{label}</label>
     {readOnly
       ? <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{infoForm[key] || "—"}</div>
       : <input type={type} value={infoForm[key]} onChange={e => setInfoForm({...infoForm, [key]: e.target.value})}
           style={{ width:"100%", padding:"0.6rem 0.85rem", border:"1.5px solid #dee2e6", borderRadius:"8px", fontSize:"0.9rem", fontFamily:"DM Sans,sans-serif", boxSizing:"border-box", outline:"none" }} />
     }
   </div>
 );

 return (
   <div>
     <PageHeader title="My Profile" subtitle="Manage your personal information and security settings" />
     <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px,1fr))", gap:"1rem" }}>

       <Card>
         <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
           <h3 style={{ margin:0, fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Personal Information</h3>
           {!infoEditing
             ? <Btn variant="outline" style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={() => { setInfoEditing(true); setInfoMsg(""); }}>Edit</Btn>
             : <div style={{ display:"flex", gap:"0.5rem" }}>
                 <Btn variant="ghost" style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={cancelInfo}>Cancel</Btn>
                 <Btn style={{ padding:"0.3rem 0.85rem", fontSize:"0.78rem" }} onClick={saveInfo} disabled={infoSaving}>{infoSaving ? "Saving..." : "Save"}</Btn>
               </div>
           }
         </div>

         {infoMsg && <div style={{ background:"#f0fff4", border:"1px solid #c6f6d5", borderRadius:"8px", padding:"0.65rem", color:"#276749", fontSize:"0.82rem", marginBottom:"1rem" }}>{infoMsg}</div>}
         {infoErr && <div style={{ background:"#fff5f5", border:"1px solid #fed7d7", borderRadius:"8px", padding:"0.65rem", color:"#c53030", fontSize:"0.82rem", marginBottom:"1rem" }}>{infoErr}</div>}

         {field("Full Name", "full_name", "text", !infoEditing)}
         {field("Email", "email", "email", !infoEditing)}
         {field("Mobile", "mobile", "tel", !infoEditing)}
         {field("Address", "address", "text", !infoEditing)}
         {field("City", "city", "text", !infoEditing)}
         {field("Country", "country", "text", !infoEditing)}

         <div style={{ marginTop:"0.5rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Username</label>
           <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{u.username}</div>
         </div>
         <div style={{ marginTop:"1rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Investor Type</label>
           <div style={{ padding:"0.6rem 0.85rem", background:"#f8f9fa", borderRadius:"8px", fontSize:"0.9rem", color:"#6c757d", border:"1.5px solid #f1f3f5" }}>{u.investor_type || "—"}</div>
         </div>
         <div style={{ marginTop:"1rem" }}>
           <label style={{ display:"block", fontSize:"0.78rem", fontWeight:"600", color:"#495057", marginBottom:"5px", letterSpacing:"0.04em" }}>Account Status</label>
           <div style={{ padding:"0.4rem 0" }}><Badge label={u.status} /></div>
         </div>
       </Card>

       <Card>
         <h3 style={{ margin:"0 0 1rem", fontSize:"0.95rem", fontWeight:"700", color:"#003770" }}>Change Password</h3>
         <Input label="Current Password" type="password" value={pwForm.current} onChange={e=>setPwForm({...pwForm,current:e.target.value})} />
         <Input label="New Password" type="password" value={pwForm.newPw} onChange={e=>setPwForm({...pwForm,newPw:e.target.value})} />
         <Input label="Confirm New Password" type="password" placeholder="Re-enter new password" value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} />
         {pwErr && <div style={{ background:"#fff5f5", border:"1px solid #fed7d7", borderRadius:"8px", padding:"0.65rem", color:"#c53030", fontSize:"0.82rem", marginBottom:"0.75rem" }}>{pwErr}</div>}
         {pwMsg && <div style={{ background:"#f0fff4", border:"1px solid #c6f6d5", borderRadius:"8px", padding:"0.65rem", color:"#276749", fontSize:"0.82rem", marginBottom:"0.75rem" }}>{pwMsg}</div>}
         <Btn onClick={updatePassword} disabled={pwSaving}>{pwSaving ? "Updating..." : "Update Password"}</Btn>
       </Card>

     </div>
   </div>
 );
}
