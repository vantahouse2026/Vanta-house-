const { createHash } = require('node:crypto');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({error:'Method not allowed.'}); }
  const origin = req.headers.origin;
  if (origin && !['https://www.vantahousestudio.com','https://vantahousestudio.com'].includes(origin)) return res.status(403).json({error:'Please use our website to send your inquiry.'});
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return res.status(400).json({error:'Please check your inquiry.'}); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({error:'Please check your inquiry.'});
  if (body.website) return res.status(400).json({error:'Please check your inquiry.'});
  const fields = ['name','email','service','message'];
  if (fields.some(k=>typeof body[k] !== 'string')) return res.status(400).json({error:'Please complete all fields.'});
  const [name,email,service,message] = fields.map(k=>body[k].trim());
  if (!name || name.length>100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || /[\r\n]/.test(email) || !['Branding','Web Design','Creative Direction','Custom Project'].includes(service) || message.length<10 || message.length>5000) return res.status(400).json({error:'Please check your details. Project details must contain 10 to 5,000 characters.'});
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM_EMAIL) return res.status(503).json({error:'Online inquiries are temporarily unavailable. Please email info@vantahousestudio.com.'});
  try {
    const payload={from:process.env.CONTACT_FROM_EMAIL,to:['info@vantahousestudio.com'],reply_to:email,subject:`VANTA HOUSE inquiry: ${service}`,text:`Name: ${name}\nEmail: ${email}\nService: ${service}\n\n${message}`};
    const key=createHash('sha256').update(JSON.stringify(payload)+Math.floor(Date.now()/86400000)).digest('hex');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
    if (!response.ok) return res.status(502).json({error:'We could not send your inquiry. Please email info@vantahousestudio.com.'});
    const result=await response.json();
    if (!result.id) return res.status(502).json({error:'We could not confirm your inquiry. Please email info@vantahousestudio.com.'});
    return res.status(200).json({ok:true});
  } catch { return res.status(502).json({error:'We could not send your inquiry. Please email info@vantahousestudio.com.'}); }
};
