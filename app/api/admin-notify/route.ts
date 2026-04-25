import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Check if SendGrid is configured
const SENDGRID_CONFIGURED = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;

if (SENDGRID_CONFIGURED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

const ADMIN_EMAIL = 'davidpolonsky@gmail.com';

async function getGeoFromIp(ip: string): Promise<{ country: string; regionName: string; city: string } | null> {
  try {
    // Skip lookup for localhost/private IPs
    if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,status`);
    const geo = await res.json();
    if (geo.status === 'success') {
      return { country: geo.country, regionName: geo.regionName, city: geo.city };
    }
  } catch (_) {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    if (!SENDGRID_CONFIGURED) {
      console.warn('SendGrid not configured - skipping admin notification');
      return NextResponse.json({ success: true, skipped: true });
    }

    const { type, data } = await req.json();

    let subject = '';
    let text = '';
    let html = '';

    if (type === 'new_user') {
      const { email, displayName, timestamp } = data;

      // Extract IP from request headers (works behind proxies like Vercel)
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = (forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'Unknown');

      // Geo lookup
      const geo = await getGeoFromIp(ip);
      const location = geo
        ? `${geo.city ? geo.city + ', ' : ''}${geo.regionName ? geo.regionName + ', ' : ''}${geo.country}`
        : 'Unknown';

      subject = `🎉 New PlayMatch User: ${displayName || email}`;
      text = `New user signed up!\n\nEmail: ${email}\nName: ${displayName || 'N/A'}\nTime: ${new Date(timestamp).toLocaleString()}\nIP: ${ip}\nLocation: ${location}`;
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a2f1b;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a2f1b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#14532d;border-radius:16px;border:1px solid #1e5c33;overflow:hidden;">
          <tr>
            <td style="background:#060f09;padding:24px;text-align:center;border-bottom:1px solid #1e5c33;">
              <p style="margin:0;font-size:24px;">⚽</p>
              <p style="margin:8px 0 0;color:#4ade80;font-size:13px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:bold;">🎉 New User Signup</h1>
              <div style="background:#060f09;border:1px solid #1e5c33;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0 0 8px;color:#4ade80;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">User Details</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;"><strong>Name:</strong> ${displayName || 'Not provided'}</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;"><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;"><strong>IP:</strong> ${ip}</p>
                <p style="margin:0;color:#e5e7eb;font-size:14px;"><strong>Location:</strong> ${location}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#060f09;padding:16px;text-align:center;border-top:1px solid #1e5c33;">
              <p style="margin:0;color:#374151;font-size:11px;">© PlayMatch · playmatch.games</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
    } else if (type === 'simulation_milestone') {
      const { count, lastUserEmail } = data;
      subject = `📊 PlayMatch: ${count} Simulations Milestone`;
      text = `Simulation milestone reached!\n\nTotal simulations: ${count}\nLast user: ${lastUserEmail}\nTime: ${new Date().toLocaleString()}`;
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a2f1b;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a2f1b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#14532d;border-radius:16px;border:1px solid #1e5c33;overflow:hidden;">
          <tr>
            <td style="background:#060f09;padding:24px;text-align:center;border-bottom:1px solid #1e5c33;">
              <p style="margin:0;font-size:24px;">⚽</p>
              <p style="margin:8px 0 0;color:#4ade80;font-size:13px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:bold;">📊 Simulation Milestone</h1>
              <p style="margin:0 0 20px;color:#4ade80;font-size:14px;">${count} simulations reached!</p>
              <div style="background:#060f09;border:1px solid #1e5c33;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:0 0 8px;color:#4ade80;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Details</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;"><strong>Total Count:</strong> ${count}</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;"><strong>Last User:</strong> ${lastUserEmail}</p>
                <p style="margin:0;color:#e5e7eb;font-size:14px;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#060f09;padding:16px;text-align:center;border-top:1px solid #1e5c33;">
              <p style="margin:0;color:#374151;font-size:11px;">© PlayMatch · playmatch.games</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    await sgMail.send({
      to: ADMIN_EMAIL,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'PlayMatch Notifications',
      },
      subject,
      text,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin notification error:', err?.response?.body || err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
