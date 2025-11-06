import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Notification service for alerts including hypoxia monitoring
// Twilio configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Nodemailer configuration
const emailTransporter = process.env.SMTP_HOST && process.env.SMTP_USER
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

/**
 * Send SMS alert via Twilio
 */
export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!twilioClient || !twilioPhoneNumber) {
    console.warn('[NOTIFICATIONS] Twilio not configured, SMS not sent:', { to, message });
    return false;
  }
  try {
    const result = await twilioClient.messages.create({ body: message, from: twilioPhoneNumber, to });
    console.log('[NOTIFICATIONS] SMS sent successfully:', result.sid);
    return true;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error sending SMS:', error);
    return false;
  }
}

/**
 * Send email alert via nodemailer
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!emailTransporter) {
    console.warn('[NOTIFICATIONS] Email not configured, email not sent:', { to, subject });
    return false;
  }
  try {
    const result = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to, subject, html
    });
    console.log('[NOTIFICATIONS] Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error sending email:', error);
    return false;
  }
}

/**
 * Send heart-health critical alert (both SMS and email)
 */
export async function sendHeartHealthAlert(
  userEmail: string,
  userPhone: string | null | undefined,
  nutrient: 'sodium' | 'cholesterol',
  currentDaily: number,
  limit: number,
  percentage: number
): Promise<void> {
  const unit = 'mg';
  const nutrientLabel = nutrient.charAt(0).toUpperCase() + nutrient.slice(1);
  const percentRounded = Math.round(percentage);
  const currentRounded = Math.round(currentDaily);
  const remaining = Math.max(0, limit - currentRounded);

  // Determine severity
  let icon = '⚡';
  let colorHex = '#eab308';
  if (percentage >= 100) {
    icon = '🚨';
    colorHex = '#ef4444';
  } else if (percentage >= 90) {
    icon = '⚠️';
    colorHex = '#f59e0b';
  }

  // SMS (concise)
  const smsMessage = `${icon} HEART HEALTH ALERT: You've consumed ${currentRounded}${unit} of ${nutrient} today (${percentRounded}% of ${limit}${unit} limit). ${nutrient === 'sodium' ? 'High sodium increases blood pressure risk.' : 'High cholesterol can clog arteries.'} Avoid ${nutrient}-rich foods for the rest of the day. - Heart Recovery Calendar`;

  // Email (detailed HTML)
  const emailSubject = `${icon} Heart Health Alert: ${nutrientLabel} Intake at ${percentRounded}%`;
  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#333;}
.container{max-width:600px;margin:0 auto;padding:20px;}
.alert-box{border-left:5px solid ${colorHex};background:${colorHex}15;padding:20px;border-radius:8px;margin:20px 0;}
.alert-header{font-size:24px;font-weight:bold;color:${colorHex};margin-bottom:10px;}
.stats{background:white;padding:15px;border-radius:6px;margin:15px 0;}
.stat-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;}
.stat-label{font-weight:600;color:#666;}
.stat-value{font-weight:bold;color:${colorHex};}
.progress-bar{height:30px;background:#f0f0f0;border-radius:15px;overflow:hidden;margin:15px 0;}
.progress-fill{height:100%;background:linear-gradient(to right,${colorHex},${colorHex}dd);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;}
.recommendations{background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;}
.recommendations h3{margin-top:0;color:#333;}
.recommendations ul{margin:10px 0;padding-left:20px;}
.recommendations li{margin:8px 0;}
.footer{margin-top:30px;padding-top:20px;border-top:2px solid #eee;font-size:12px;color:#666;text-align:center;}
.cta-button{display:inline-block;padding:12px 24px;background:${colorHex};color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:15px 0;}
</style></head><body><div class="container">
<div class="alert-box"><div class="alert-header">${icon} Heart Health Alert</div>
<p style="margin:5px 0 0 0;font-size:16px;">You are approaching your daily ${nutrient} limit. Your heart health depends on staying within recommended limits.</p></div>
<div class="stats">
<div class="stat-row"><span class="stat-label">${nutrientLabel} Consumed Today:</span><span class="stat-value">${currentRounded} ${unit}</span></div>
<div class="stat-row"><span class="stat-label">Recommended Daily Limit:</span><span class="stat-value">${limit} ${unit}</span></div>
<div class="stat-row"><span class="stat-label">Percentage of Limit:</span><span class="stat-value">${percentRounded}%</span></div>
<div class="stat-row" style="border-bottom:none;"><span class="stat-label">Remaining Today:</span><span class="stat-value">${remaining} ${unit}</span></div>
</div>
<div class="progress-bar"><div class="progress-fill" style="width:${Math.min(percentage, 100)}%;">${percentRounded}% of Daily Limit</div></div>
${percentage >= 100 ? `<div class="alert-box" style="border-left-color:#dc2626;background:#dc262615;">
<p style="margin:0;font-weight:bold;color:#dc2626;">⛔ You have EXCEEDED your daily ${nutrient} limit!</p>
<p style="margin:10px 0 0 0;">Please avoid all ${nutrient}-rich foods for the rest of the day and consult your care team if you experience any symptoms.</p></div>` : ''}
<div class="recommendations"><h3>🫀 Why This Matters for Your Heart</h3><p>
${nutrient === 'sodium' ? '<strong>High sodium intake increases blood pressure</strong>, which forces your heart to work harder and increases risk of heart attack, stroke, and heart failure. For heart recovery patients, controlling sodium is critical.' : '<strong>Excess cholesterol can clog your arteries</strong> with plaque buildup, restricting blood flow to your heart and brain. This significantly increases risk of heart attack and stroke, especially during recovery.'}
</p><h3>✅ What To Do Now</h3><ul>
${nutrient === 'sodium' ? `<li>Avoid processed foods, canned soups, deli meats, cheese, and salty snacks</li>
<li>Don't add salt to your meals</li>
<li>Read nutrition labels carefully - "low sodium" means ≤140mg per serving</li>
<li>Drink plenty of water to help flush excess sodium</li>
<li>Choose fresh fruits and vegetables (naturally low in sodium)</li>` : `<li>Avoid red meat, full-fat dairy, butter, and fried foods</li>
<li>Skip eggs (1 egg = ~185mg cholesterol)</li>
<li>Choose plant-based proteins like beans and lentils</li>
<li>Eat fish rich in omega-3s (salmon, mackerel) instead</li>
<li>Load up on fiber-rich foods to help lower cholesterol</li>`}
</ul>
${percentage >= 100 ? `<p style="background:#fee2e2;padding:10px;border-radius:4px;margin:15px 0;color:#991b1b;">
<strong>⚠️ IMPORTANT:</strong> You've exceeded your daily limit. If you experience chest pain, shortness of breath, rapid heartbeat, or unusual fatigue, contact your healthcare provider immediately.</p>` : ''}
</div>
<center><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/meals" class="cta-button">View My Nutrition Dashboard →</a></center>
<div class="footer"><p><strong>Heart Recovery Calendar</strong></p>
<p>This is an automated health alert from your Heart Recovery Calendar system.</p>
<p>If you have questions or concerns, please contact your healthcare provider.</p>
<p style="margin-top:15px;font-size:11px;color:#999;">You received this alert because your daily ${nutrient} intake reached ${percentRounded}% of the recommended limit. These alerts help protect your heart health during recovery.</p>
</div></div></body></html>`;

  // Send both SMS and email
  const promises: Promise<boolean>[] = [];
  if (userPhone) promises.push(sendSMS(userPhone, smsMessage));
  promises.push(sendEmail(userEmail, emailSubject, emailHtml));
  await Promise.all(promises);

  console.log(`[NOTIFICATIONS] Heart health alert sent for ${nutrient}: ${percentRounded}% of limit`);
}

/**
 * Send rapid weight change alert (both SMS and email)
 */
export async function sendWeightChangeAlert(
  userEmail: string,
  userPhone: string | null | undefined,
  changeAmount: number,
  changePerWeek: number,
  currentWeight: number,
  isGain: boolean,
  timePeriodDays: number
): Promise<void> {
  const direction = isGain ? 'gained' : 'lost';
  const directionCaps = isGain ? 'Gain' : 'Loss';
  const changeAbsolute = Math.abs(changeAmount);
  const changePerWeekRounded = Math.round(changePerWeek * 10) / 10;

  // Determine severity
  let icon = '⚠️';
  let colorHex = '#f59e0b';
  let severity = 'concerning';
  if (changePerWeek > 3.5) {
    icon = '🚨';
    colorHex = '#ef4444';
    severity = 'dangerous';
  }

  // SMS (concise)
  const smsMessage = `${icon} WEIGHT ALERT: You've ${direction} ${changeAbsolute.toFixed(1)} lbs in ${timePeriodDays} days (~${changePerWeekRounded} lbs/week). This rapid weight ${direction === 'gained' ? 'gain' : 'loss'} is ${severity} and may indicate fluid retention, medication issues, or other health concerns. Please contact your care team. - Heart Recovery Calendar`;

  // Email (detailed HTML)
  const emailSubject = `${icon} Weight Alert: Rapid Weight ${directionCaps} Detected`;
  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#333;}
.container{max-width:600px;margin:0 auto;padding:20px;}
.alert-box{border-left:5px solid ${colorHex};background:${colorHex}15;padding:20px;border-radius:8px;margin:20px 0;}
.alert-header{font-size:24px;font-weight:bold;color:${colorHex};margin-bottom:10px;}
.stats{background:white;padding:15px;border-radius:6px;margin:15px 0;}
.stat-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;}
.stat-label{font-weight:600;color:#666;}
.stat-value{font-weight:bold;color:${colorHex};}
.recommendations{background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;}
.recommendations h3{margin-top:0;color:#333;}
.recommendations ul{margin:10px 0;padding-left:20px;}
.recommendations li{margin:8px 0;}
.footer{margin-top:30px;padding-top:20px;border-top:2px solid #eee;font-size:12px;color:#666;text-align:center;}
.cta-button{display:inline-block;padding:12px 24px;background:${colorHex};color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:15px 0;}
.warning-box{background:#fee2e2;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #dc2626;}
</style></head><body><div class="container">
<div class="alert-box"><div class="alert-header">${icon} Rapid Weight ${directionCaps} Alert</div>
<p style="margin:5px 0 0 0;font-size:16px;">We've detected a rapid weight change that requires immediate attention from your healthcare team.</p></div>
<div class="stats">
<div class="stat-row"><span class="stat-label">Weight ${directionCaps}:</span><span class="stat-value">${changeAbsolute.toFixed(1)} lbs</span></div>
<div class="stat-row"><span class="stat-label">Time Period:</span><span class="stat-value">${timePeriodDays} days</span></div>
<div class="stat-row"><span class="stat-label">Rate of Change:</span><span class="stat-value">~${changePerWeekRounded} lbs/week</span></div>
<div class="stat-row" style="border-bottom:none;"><span class="stat-label">Current Weight:</span><span class="stat-value">${currentWeight} lbs</span></div>
</div>
<div class="warning-box">
<p style="margin:0;font-weight:bold;color:#dc2626;">⚠️ This rate of weight change is ${severity.toUpperCase()}!</p>
<p style="margin:10px 0 0 0;color:#991b1b;">Rapid weight changes can indicate serious health issues and require immediate medical evaluation.</p>
</div>
<div class="recommendations"><h3>🫀 Why This Matters for Your Heart</h3><p>
${isGain
  ? '<strong>Rapid weight gain</strong> in heart patients often indicates <strong>fluid retention</strong> (edema), which can be a sign of worsening heart failure. Excess fluid makes your heart work harder and can lead to serious complications including shortness of breath, leg swelling, and increased blood pressure.'
  : '<strong>Rapid weight loss</strong> in heart patients can indicate <strong>dehydration, loss of muscle mass, or medication side effects</strong>. Unintentional rapid weight loss can weaken your heart, reduce energy levels, and compromise your recovery.'}
</p><h3>🚨 Immediate Action Required</h3><ul>
<li><strong>Contact your healthcare provider TODAY</strong> - do not wait</li>
<li>Report this weight change and any symptoms you're experiencing</li>
${isGain
  ? `<li>Check for signs of fluid retention: swollen ankles/legs, difficulty breathing, bloating</li>
<li>Monitor your blood pressure if you have a home monitor</li>
<li>Reduce sodium intake immediately (aim for less than 1500mg/day)</li>
<li>Do NOT stop taking your medications without medical advice</li>`
  : `<li>Check for signs of dehydration: dark urine, dizziness, dry mouth, fatigue</li>
<li>Ensure you're eating enough calories and protein</li>
<li>Review your medications with your doctor (some can cause weight loss)</li>
<li>Monitor for fever, nausea, or loss of appetite</li>`}
</ul>
<p style="background:#fef3c7;padding:10px;border-radius:4px;margin:15px 0;border-left:3px solid #f59e0b;">
<strong>📞 Call 911 immediately if you experience:</strong><br>
• Severe shortness of breath or chest pain<br>
• Rapid or irregular heartbeat<br>
• Extreme weakness or fainting<br>
• Confusion or difficulty speaking
</p>
</div>
<center><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vitals" class="cta-button">View My Weight Journal →</a></center>
<div class="footer"><p><strong>Heart Recovery Calendar</strong></p>
<p>This is an automated health alert from your Heart Recovery Calendar system.</p>
<p>Rapid weight changes (more than ${changePerWeek > 3.5 ? '3.5' : '2'} lbs/week) can indicate serious health issues requiring immediate medical attention.</p>
<p style="margin-top:15px;font-size:11px;color:#999;">You received this alert because you ${direction} ${changeAbsolute.toFixed(1)} lbs over ${timePeriodDays} days. Your care team has been notified.</p>
</div></div></body></html>`;

  // Send both SMS and email
  const promises: Promise<boolean>[] = [];
  if (userPhone) promises.push(sendSMS(userPhone, smsMessage));
  promises.push(sendEmail(userEmail, emailSubject, emailHtml));
  await Promise.all(promises);

  console.log(`[NOTIFICATIONS] Rapid weight ${direction} alert sent: ${changePerWeekRounded} lbs/week`);
}

/**
 * Send Hawk Alert for medication-induced side effects
 */
export async function sendHawkAlert(
  userEmail: string,
  userPhone: string | null | undefined,
  alertType: 'weight_gain' | 'weight_loss' | 'edema' | 'hyperglycemia' | 'hypoglycemia' | 'food_medication_interaction' | 'bradycardia' | 'tachycardia' | 'hypoxia',
  severity: 'warning' | 'danger',
  medicationNames: string[],
  message: string,
  recommendation: string,
  careTeamEmails: string[],
  foodItems?: string[]
): Promise<void> {
  const icon = severity === 'danger' ? '🚨' : '⚠️';
  const colorHex = severity === 'danger' ? '#ef4444' : '#f59e0b';
  const severityLabel = severity === 'danger' ? 'CRITICAL' : 'WARNING';

  const medList = medicationNames.join(', ');
  const alertTypeLabel =
    alertType === 'weight_gain' ? 'Weight Gain' :
    alertType === 'weight_loss' ? 'Weight Loss' :
    alertType === 'edema' ? 'Edema/Fluid Retention' :
    alertType === 'hyperglycemia' ? 'High Blood Sugar (Hyperglycemia)' :
    alertType === 'hypoglycemia' ? 'Low Blood Sugar (Hypoglycemia)' :
    alertType === 'food_medication_interaction' ? 'Food-Medication Interaction' :
    alertType === 'bradycardia' ? 'Slow Heart Rate (Bradycardia)' :
    alertType === 'tachycardia' ? 'Rapid Heart Rate (Tachycardia)' :
    'Low Oxygen (Hypoxia)';

  // SMS (concise)
  const smsMessage = `${icon} ${severityLabel} HAWK ALERT: ${message}. Medications involved: ${medList}. ${recommendation} - Heart Recovery Calendar`;

  // Email (detailed HTML)
  const emailSubject = `${icon} ${severityLabel} Hawk Alert: Medication-Induced ${alertTypeLabel}`;
  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#333;}
.container{max-width:600px;margin:0 auto;padding:20px;}
.alert-box{border-left:5px solid ${colorHex};background:${colorHex}15;padding:20px;border-radius:8px;margin:20px 0;}
.alert-header{font-size:24px;font-weight:bold;color:${colorHex};margin-bottom:10px;}
.hawk-badge{display:inline-block;background:${colorHex};color:white;padding:8px 16px;border-radius:20px;font-weight:bold;font-size:14px;margin-bottom:15px;}
.meds-list{background:white;padding:15px;border-radius:6px;margin:15px 0;}
.med-item{padding:10px;margin:5px 0;background:#f8f9fa;border-left:3px solid ${colorHex};border-radius:4px;}
.recommendations{background:#f8f9fa;padding:15px;border-radius:6px;margin:15px 0;}
.recommendations h3{margin-top:0;color:#333;}
.recommendations ul{margin:10px 0;padding-left:20px;}
.recommendations li{margin:8px 0;}
.footer{margin-top:30px;padding-top:20px;border-top:2px solid #eee;font-size:12px;color:#666;text-align:center;}
.cta-button{display:inline-block;padding:12px 24px;background:${colorHex};color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:15px 0;}
.critical-warning{background:#fee2e2;padding:15px;border-radius:6px;margin:15px 0;border-left:4px solid #dc2626;}
</style></head><body><div class="container">
<div class="alert-box">
<span class="hawk-badge">${icon} HAWK ALERT - ${severityLabel}</span>
<div class="alert-header">${message}</div>
<p style="margin:5px 0 0 0;font-size:16px;">Our intelligent monitoring system has detected a potential medication-induced side effect that requires your attention.</p>
</div>

<div class="meds-list">
<h3 style="margin:0 0 10px 0;color:${colorHex};">📋 Medications Involved:</h3>
${medicationNames.map(med => `<div class="med-item"><strong>${med}</strong></div>`).join('')}
</div>

${foodItems && foodItems.length > 0 ? `<div class="meds-list">
<h3 style="margin:0 0 10px 0;color:${colorHex};">🍽️ Recent Foods Consumed:</h3>
${foodItems.map(food => `<div class="med-item">${food}</div>`).join('')}
</div>` : ''}

${severity === 'danger' ? `<div class="critical-warning">
<p style="margin:0;font-weight:bold;color:#dc2626;">${icon} CRITICAL: Immediate Action Required</p>
<p style="margin:10px 0 0 0;color:#991b1b;">This is a high-severity alert. Contact your healthcare provider today for medication review.</p>
</div>` : ''}

<div class="recommendations">
<h3>🫀 What This Means</h3>
<p>${recommendation}</p>

<h3>✅ Immediate Actions</h3>
<ul>
<li><strong>DO NOT stop taking your medications</strong> without consulting your doctor</li>
<li><strong>Contact your healthcare provider</strong> to discuss this correlation</li>
<li><strong>Keep taking your vitals regularly</strong> to monitor the situation</li>
<li><strong>Document any other symptoms</strong> you're experiencing</li>
<li>Your care team has been automatically notified of this alert</li>
</ul>

<h3>⚕️ Questions to Ask Your Provider</h3>
<ul>
<li>Is this side effect expected with my current medications?</li>
<li>Should we consider adjusting the dosage?</li>
<li>Are there alternative medications with fewer side effects?</li>
<li>What warning signs should I watch for?</li>
</ul>
</div>

<center><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/medications" class="cta-button">View My Medications →</a></center>

<div class="footer">
<p><strong>🦅 Hawk Alert System - Heart Recovery Calendar</strong></p>
<p>This intelligent alert was generated by analyzing correlations between your vitals and medication side effects.</p>
<p><strong>Care Team Notified:</strong> Your healthcare providers have been automatically informed.</p>
<p style="margin-top:15px;font-size:11px;color:#999;">Hawk Alerts help identify potential medication-related issues early. Always consult your healthcare provider before making any changes to your medication regimen.</p>
</div>
</div></body></html>`;

  // Send to patient
  const patientPromises: Promise<boolean>[] = [];
  if (userPhone) patientPromises.push(sendSMS(userPhone, smsMessage));
  patientPromises.push(sendEmail(userEmail, emailSubject, emailHtml));

  // Send to care team (email only, simplified version)
  const careTeamEmailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;padding:20px;">
<h2 style="color:${colorHex};">${icon} ${severityLabel} Hawk Alert: Patient Notification</h2>
<p><strong>Patient:</strong> ${userEmail}</p>
<p><strong>Alert Type:</strong> Medication-Induced ${alertTypeLabel}</p>
<p><strong>Medications Involved:</strong> ${medList}</p>
<p><strong>Message:</strong> ${message}</p>
<p><strong>Recommendation:</strong> ${recommendation}</p>
<p style="margin-top:20px;padding:15px;background:#f8f9fa;border-left:4px solid ${colorHex};">
<strong>Action Required:</strong> Please review this patient's medications and vitals data. Consider scheduling a follow-up appointment to discuss medication adjustments.
</p>
<p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/patients" style="display:inline-block;padding:12px 24px;background:${colorHex};color:white;text-decoration:none;border-radius:6px;margin-top:15px;">View Patient Dashboard →</a></p>
<hr style="margin-top:30px;">
<p style="font-size:12px;color:#666;">This is an automated Hawk Alert from the Heart Recovery Calendar system.</p>
</body></html>`;

  const careTeamPromises = careTeamEmails.map(email =>
    sendEmail(email, `${icon} Hawk Alert: Patient ${userEmail} - ${alertTypeLabel}`, careTeamEmailHtml)
  );

  await Promise.all([...patientPromises, ...careTeamPromises]);

  console.log(`[NOTIFICATIONS] Hawk Alert sent: ${alertType}, ${medicationNames.length} medications, ${careTeamEmails.length} care team members notified`);
}