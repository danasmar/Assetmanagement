import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { colors, fonts } from "../utils/theme";
// Base64 logo data — unchanged, keep original line here
const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Disclaimer sections constant
const DISCLAIMER_SECTIONS = [
  ['1. Regulatory Status', 'Audi Capital is a financial institution licensed and regulated by the Capital Market Authority (CMA) of the Kingdom of Saudi Arabia under License Number 06017-37. All investment activities, products, and services offered through this portal are conducted in accordance with the Capital Market Law, its Implementing Regulations, and all applicable CMA rules and guidelines.'],
  ['2. Restricted Access — Qualified Investors Only', 'Access to this portal is strictly limited to existing clients of Audi Capital who have been formally onboarded and classified as Qualified Investors in accordance with the CMA\'s definition under the Investment Funds Regulations and the Capital Market Institutions Regulations. By logging in, you confirm that you are an authorized and onboarded client of Audi Capital, that you have satisfied all applicable Know-Your-Customer (KYC) and Anti-Money Laundering (AML) requirements, and that you are accessing this portal solely to review your existing investments or to act upon investment opportunities made available to you by Audi Capital in accordance with your investor profile.\n\nUnauthorized access to this portal is strictly prohibited. If you have received access credentials in error, please contact Audi Capital immediately and do not proceed further.'],
  ['3. Nature of Information', 'The information, data, and materials presented within this portal are provided exclusively for informational purposes and are intended solely for the use of the authorized investor to whom access has been granted. The content of this portal does not constitute a public offering, a solicitation, or an invitation to invest and should not be construed as such. Nothing contained herein constitutes investment, legal, tax, or regulatory advice.\n\nInvestment opportunities displayed on this platform are made available only to eligible clients based on their individually assessed risk profile, investment objectives, and financial circumstances as determined during the onboarding process.'],
  ['4. Investment Risks', 'Investing involves risk. The value of investments and the income derived from them may go down as well as up, and you may not recover the full amount originally invested. Certain investment products, including but not limited to private equity, real estate funds, and alternative asset funds, carry a higher degree of risk, are illiquid in nature, and may not be suitable for all investors. Past performance is not a reliable indicator of future results, and any projections, targets, or estimates presented are not guaranteed.\n\nPrior to making any investment decision, you are strongly advised to review the relevant offering documents, fund prospectus, and terms and conditions, and to seek independent professional advice where appropriate.'],
  ['5. Confidentiality of Information', 'All information contained within this portal, including deal details, fund performance data, investor reports, and any other materials, is strictly confidential. By accessing this portal, you agree not to disclose, reproduce, distribute, or transmit any such information to any third party without the prior written consent of Audi Capital, except as required by applicable law or regulation.'],
  ['6. Security & Account Responsibility', 'You are solely responsible for maintaining the strict confidentiality of your login credentials, including your username, password, and any one-time passcodes or authentication codes. You must not share, disclose, or otherwise permit any other person to use your access credentials under any circumstances.\n\nAudi Capital accepts no liability for any losses, damages, unauthorized transactions, or any other adverse consequences arising from the sharing, disclosure, compromise, or misuse of your account credentials. You agree to notify Audi Capital immediately upon becoming aware of any unauthorized use of your account or any other breach of security.'],
  ['7. No Warranty', 'While Audi Capital endeavors to ensure the accuracy and completeness of the information presented on this portal, no representation or warranty, express or implied, is made as to the accuracy, reliability, or completeness of such information. Audi Capital shall not be liable for any errors, omissions, interruptions, or delays in the provision of information through this portal.'],
  ['8. Governing Law', 'This portal and all information contained herein are governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia. Any disputes arising in connection with this portal shall be subject to the exclusive jurisdiction of the competent courts and regulatory authorities of the Kingdom of Saudi Arabia, including the CMA.'],
];

const s = {
 page: { height: "100vh", background: "#091f58", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "DM Sans, sans-serif", position: "relative", overflow: "hidden" },
 bgWrap: { position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" },
 bgImg: { position: "absolute", right: "242px", top: "50%", transform: "translateY(calc(-50% - 302px))", width: "480px", height: "480px", opacity: 0.22, objectFit: "contain", mixBlendMode: "lighten" },
 card: { background: "rgba(255,255,255,0.97)", borderRadius: "20px", padding: "clamp(1.5rem, 5vw, 2.5rem)", width: "100%", maxWidth: "400px", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", position: "relative", zIndex: 1, boxSizing: "border-box", marginRight: "0" },
 logo: { textAlign: "center", marginBottom: "1.75rem" },
 logoText: { fontFamily: "DM Serif Display, serif", fontSize: "clamp(1.4rem, 4vw, 1.8rem)", color: "#091f58", display: "block" },
 logoSub: { fontSize: "0.75rem", color: "#6c757d", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginTop: "4px" },
 tabs: { display: "flex", background: "#f1f3f5", borderRadius: "10px", padding: "4px", marginBottom: "1.5rem" },
 tab: { flex: 1, padding: "0.5rem", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", transition: "all 0.2s" },
 tabActive: { background: "#091f58", color: "#fff", boxShadow: "0 2px 8px rgba(9,31,88,0.35)" },
 tabInactive: { background: "transparent", color: "#6c757d" },
 label: { display: "block", fontSize: "0.78rem", fontWeight: "600", color: "#495057", marginBottom: "5px", letterSpacing: "0.04em" },
 input: { width: "100%", padding: "0.7rem 1rem", border: "1.5px solid #dee2e6", borderRadius: "10px", fontSize: "0.95rem", outline: "none", transition: "border-color 0.2s", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" },
 inputFocus: { borderColor: "#091f58" },
 btn: { width: "100%", padding: "0.85rem", background: "#091f58", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", marginTop: "1rem", transition: "background 0.2s", fontFamily: "DM Sans, sans-serif" },
 error: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", padding: "0.75rem", color: "#c53030", fontSize: "0.85rem", marginTop: "1rem", textAlign: "center" },
 footer: { textAlign: "center", marginTop: "1.75rem", fontSize: "0.75rem", color: "#adb5bd" },
};

const Background = () => (
  <div style={s.bgWrap}>
    <img src={LOGO} alt="" style={s.bgImg} />
  </div>
);

const LoginForm = ({ role, identifier, password, focusField, error, loading, setIdentifier, setPassword, setFocusField, handleLogin, setShowForgotPassword }) => (
  <form onSubmit={handleLogin}>
    <div style={{ marginBottom: "1rem" }}>
      <label style={s.label}>Username or Email</label>
      <input style={{ ...s.input, ...(focusField === "id" ? s.inputFocus : {}) }} type="text" placeholder="Username or email" value={identifier} onChange={e => setIdentifier(e.target.value)} onFocus={() => setFocusField("id")} onBlur={() => setFocusField("")} required />
    </div>
    <div style={{ marginBottom: "0.5rem" }}>
      <label style={s.label}>Password</label>
      <input style={{ ...s.input, ...(focusField === "pw" ? s.inputFocus : {}) }} type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocusField("pw")} onBlur={() => setFocusField("")} required />
    </div>
    {error && <div style={s.error}>{error}</div>}
    <button type="submit" style={{ ...s.btn, background: loading ? "#6c757d" : "#091f58" }} disabled={loading}>
      {loading ? "Authenticating..." : "Sign In as " + (role === "investor" ? "Investor" : "Admin")}
    </button>
  </form>
);

const ForceResetForm = ({ forceReset, newPassword, confirmPassword, focusField, error, loading, setNewPassword, setConfirmPassword, setFocusField, handlePasswordReset }) => (
  <div style={{ ...s.card, marginRight: 0 }}>
    <div style={s.logo}>
      <span style={s.logoText}>Audi Capital</span>
      <span style={s.logoSub}>Set Your New Password</span>
    </div>
    <p style={{ fontSize: "0.9rem", color: "#6c757d", marginBottom: "1.5rem", marginTop: 0 }}>
      Welcome, {forceReset.full_name}. Please set a new password to continue.
    </p>
    <form onSubmit={handlePasswordReset}>
      <div style={{ marginBottom: "1rem" }}>
        <label style={s.label}>New Password</label>
        <input style={{ ...s.input, ...(focusField === "np" ? s.inputFocus : {}) }} type="password" placeholder="Minimum 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} onFocus={() => setFocusField("np")} onBlur={() => setFocusField("")} required />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label style={s.label}>Confirm New Password</label>
        <input style={{ ...s.input, ...(focusField === "cp" ? s.inputFocus : {}) }} type="password" placeholder="Re-enter your new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onFocus={() => setFocusField("cp")} onBlur={() => setFocusField("")} required />
      </div>
      {error && <div style={s.error}>{error}</div>}
      <button type="submit" style={s.btn} disabled={loading}>{loading ? "Saving..." : "Set Password and Sign In"}</button>
    </form>
  </div>
);

const DisclaimerModal = ({ showDisclaimer, setShowDisclaimer }) => (
  showDisclaimer && (
    <div onClick={() => setShowDisclaimer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '2rem', position: 'relative', fontFamily: 'DM Sans, sans-serif' }}>
        <button onClick={() => setShowDisclaimer(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}>×</button>
        <h2 style={{ color: '#091f58', fontFamily: 'DM Serif Display, serif', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Important Disclosures & Terms of Access</h2>
        {DISCLAIMER_SECTIONS.map(([title, body]) => (
          <div key={title} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: '700', color: '#091f58', fontSize: '0.9rem', marginBottom: '0.4rem' }}>{title}</div>
            {body.split('\n\n').map((para, i) => (
              <p key={i} style={{ fontSize: '0.85rem', color: '#495057', lineHeight: 1.7, margin: '0 0 0.5rem' }}>{para}</p>
            ))}
          </div>
        ))}
        <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#495057', lineHeight: 1.7, margin: 0 }}>By clicking <strong>'Login'</strong>, you confirm that you have read, understood, and agree to all of the above disclosures and terms of access.</p>
          <p style={{ fontSize: '0.82rem', color: '#6c757d', marginTop: '0.5rem' }}>For queries, contact: <strong>compliance@audicapital.com</strong> | CMA License No. 06017-37</p>
        </div>
        <button onClick={() => setShowDisclaimer(false)} style={{ marginTop: '1.25rem', width: '100%', padding: '0.75rem', background: '#091f58', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Close</button>
      </div>
    </div>
  )
);

const ForgotPasswordModal = ({ showForgotPassword, setShowForgotPassword, resetSent, resetEmail, focusField, resetError, resetLoading, setResetEmail, setFocusField, handleForgotPassword }) => (
  showForgotPassword && (
    <div onClick={() => setShowForgotPassword(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%', padding: '2rem', position: 'relative', fontFamily: 'DM Sans, sans-serif' }}>
        <button onClick={() => setShowForgotPassword(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}>×</button>
        <h2 style={{ color: '#091f58', fontFamily: 'DM Serif Display, serif', marginTop: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>Forgot Password</h2>
        {resetSent ? (
          <div>
            <p style={{ fontSize: '0.9rem', color: '#495057', lineHeight: 1.6 }}>
              If an account with that email exists, it has been flagged for a password reset. Please contact your administrator to receive your new temporary password.
            </p>
            <button onClick={() => setShowForgotPassword(false)} style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#091f58', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Back to Sign In</button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: 0, marginBottom: '1.25rem' }}>Enter your email address and we will flag your account for a password reset.</p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Email Address</label>
              <input style={{ ...s.input, ...(focusField === "re" ? s.inputFocus : {}) }} type="email" placeholder="Your email address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} onFocus={() => setFocusField("re")} onBlur={() => setFocusField("")} required />
            </div>
            {resetError && <div style={s.error}>{resetError}</div>}
            <button type="submit" style={{ ...s.btn, background: resetLoading ? "#6c757d" : "#091f58" }} disabled={resetLoading}>{resetLoading ? "Submitting..." : "Submit"}</button>
          </form>
        )}
      </div>
    </div>
  )
);

export default function Login({ onLogin }) {
 const [role, setRole] = useState("investor");
 const [identifier, setIdentifier] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [focusField, setFocusField] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [forceReset, setForceReset] = useState(null);
 const [showDisclaimer, setShowDisclaimer] = useState(false);
 const [showForgotPassword, setShowForgotPassword] = useState(false);
 const [resetEmail, setResetEmail] = useState("");
 const [resetSent, setResetSent] = useState(false);
 const [resetLoading, setResetLoading] = useState(false);
 const [resetError, setResetError] = useState("");

 const handleLogin = async (e) => {
   e.preventDefault();
   setError("");
   setLoading(true);
   try {
     if (role === "investor") {
       const id = identifier.toLowerCase().trim();
       const { data, error: err } = await supabase
         .from("investors")
         .select("*")
         .or("username.ilike." + id + ",email.ilike." + id)
         .single();
       if (err || !data) { setError("No account found. Check your username or email."); setLoading(false); return; }
       if (data.password !== password) { setError("Incorrect password."); setLoading(false); return; }
       if (data.status === "Pending") { setError("Your account is pending approval."); setLoading(false); return; }
       if (data.status === "Suspended") { setError("Your account has been suspended."); setLoading(false); return; }
       if (data.force_password_change) { setForceReset(data); setLoading(false); return; }
       onLogin({ user: data, role: "investor" });
     } else {
       const id = identifier.toLowerCase().trim();
       const { data, error: err } = await supabase
         .from("admin_users")
         .select("*")
         .or("username.ilike." + id + ",email.ilike." + id)
         .single();
       if (err || !data) { setError("No admin account found."); setLoading(false); return; }
       if (data.password !== password) { setError("Incorrect password."); setLoading(false); return; }
       if (data.status === "Inactive") { setError("This admin account is inactive."); setLoading(false); return; }
       if (data.force_password_change) { setForceReset({ ...data, isAdmin: true }); setLoading(false); return; }
       onLogin({ user: data, role: "admin" });
     }
   } catch (e) {
     setError("An error occurred. Please try again.");
   }
   setLoading(false);
 };

 const handleForgotPassword = async (e) => {
  e.preventDefault();
  setResetError("");
  setResetLoading(true);
  const email = resetEmail.toLowerCase().trim();
  const { data: investor } = await supabase.from("investors").select("id").ilike("email", email).single();
  const { data: admin } = await supabase.from("admin_users").select("id").ilike("email", email).single();
  if (investor) {
    await supabase.from("investors").update({ force_password_change: true }).eq("id", investor.id);
  } else if (admin) {
    await supabase.from("admin_users").update({ force_password_change: true }).eq("id", admin.id);
  }
  setResetLoading(false);
  setResetSent(true);
};

const handlePasswordReset = async (e) => {
   e.preventDefault();
   if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
   if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
   setLoading(true);
   const table = forceReset.isAdmin ? "admin_users" : "investors";
   await supabase.from(table).update({ password: newPassword, force_password_change: false }).eq("id", forceReset.id);
   const updated = { ...forceReset, password: newPassword, force_password_change: false };
   onLogin({ user: updated, role: forceReset.isAdmin ? "admin" : "investor" });
   setLoading(false);
 };

 if (forceReset) return (
   <div style={s.page}>
     <Background />
     <ForceResetForm
       forceReset={forceReset}
       newPassword={newPassword}
       confirmPassword={confirmPassword}
       focusField={focusField}
       error={error}
       loading={loading}
       setNewPassword={setNewPassword}
       setConfirmPassword={setConfirmPassword}
       setFocusField={setFocusField}
       handlePasswordReset={handlePasswordReset}
     />
   </div>
 );

 return (
   <div style={s.page}>
     <Background />
     <div style={s.card}>
       <div style={s.logo}>
         <span style={s.logoText}>Audi Capital</span>
         <span style={s.logoSub}>Secure Investor Portal</span>
       </div>
       <div style={s.tabs}>
         <button style={{ ...s.tab, ...(role === "investor" ? s.tabActive : s.tabInactive) }} onClick={() => setRole("investor")}>Investor</button>
         <button style={{ ...s.tab, ...(role === "admin" ? s.tabActive : s.tabInactive) }} onClick={() => setRole("admin")}>Admin</button>
       </div>
       <LoginForm
         role={role}
         identifier={identifier}
         password={password}
         focusField={focusField}
         error={error}
         loading={loading}
         setIdentifier={setIdentifier}
         setPassword={setPassword}
         setFocusField={setFocusField}
         handleLogin={handleLogin}
         setShowForgotPassword={setShowForgotPassword}
       />
       <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
         <button onClick={() => { setShowForgotPassword(true); setResetSent(false); setResetEmail(""); setResetError(""); }} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'DM Sans, sans-serif', padding: 0 }}>
           Forgot Password?
         </button>
       </div>
       <div style={s.footer}>
         Copyright {new Date().getFullYear()} Audi Capital. All rights reserved.
         <br />
         <button onClick={() => setShowDisclaimer(true)} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'DM Sans, sans-serif', marginTop: '6px', padding: 0 }}>
           Disclaimer
         </button>
       </div>
     </div>
     <DisclaimerModal showDisclaimer={showDisclaimer} setShowDisclaimer={setShowDisclaimer} />
     <ForgotPasswordModal
       showForgotPassword={showForgotPassword}
       setShowForgotPassword={setShowForgotPassword}
       resetSent={resetSent}
       resetEmail={resetEmail}
       focusField={focusField}
       resetError={resetError}
       resetLoading={resetLoading}
       setResetEmail={setResetEmail}
       setFocusField={setFocusField}
       handleForgotPassword={handleForgotPassword}
     />
   </div>
 );
}
