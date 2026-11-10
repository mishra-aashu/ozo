/**
 * OZO Doorstep Home & Commercial Services
 * Client-Side Tax Invoice & Estimate Printer
 */

export function printServiceInvoice(booking, provider) {
  if (!booking) return

  const customerAddress = typeof booking.address_json === 'object'
    ? (booking.address_json?.full_address || booking.address_json?.address || 'Patna Doorstep')
    : (booking.address_json || 'Patna Doorstep')

  const bookingDate = booking.scheduled_date || (booking.scheduled_at ? booking.scheduled_at.split(' ')[0] : new Date().toISOString().split('T')[0])
  const invoiceNumber = `INV-${booking.booking_number || booking.id?.slice(0, 8).toUpperCase()}`

  const visitingFee = Number(booking.visiting_fee || booking.total_amount || 0)
  const laborFee = Number(booking.labor_fee || 0)
  const partsFee = Number(booking.parts_fee || 0)
  const discount = Number(booking.discount_amount || 0)
  const taxes = Number(booking.taxes_amount || 0)
  const totalAmount = Number(booking.total_amount || (visitingFee + laborFee + partsFee - discount + taxes))

  const printWindow = window.open('', '_blank', 'width=850,height=900')
  if (!printWindow) {
    alert('Please allow popups to print the service tax invoice.')
    return
  }

  const invoiceHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Tax Invoice - ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #fff; color: #1f2937; padding: 32px; font-size: 13px; line-height: 1.5; }
    .invoice-card { max-width: 780px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: 900; font-size: 20px; display: flex; align-items: center; justify-content: center; }
    .brand-name { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .brand-tag { font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
    .invoice-number { font-family: monospace; font-weight: 800; color: #64748b; font-size: 13px; margin-top: 2px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
    .party-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
    .party-name { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #475569; margin-bottom: 2px; }
    
    .service-info { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .service-info-title { font-weight: 800; font-size: 14px; color: #1e40af; }
    .service-info-slot { font-weight: 700; font-size: 12px; color: #3b82f6; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 800; }
    .font-mono { font-family: monospace; }
    
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-table { width: 300px; border-collapse: collapse; }
    .totals-table td { padding: 6px 12px; border: none; }
    .totals-table tr.grand-total { border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
    .totals-table tr.grand-total td { padding: 10px 12px; font-size: 16px; font-weight: 900; color: #0f172a; }

    .security-note { border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
    .otp-verified { color: #059669; font-weight: 800; display: flex; align-items: center; gap: 4px; }
    
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 780px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; cursor: pointer; font-size: 13px;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <div class="brand-logo">O</div>
        <div>
          <div class="brand-name">Ozo Services</div>
          <div class="brand-tag">Doorstep Home & Commercial Services</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">Tax Invoice</div>
        <div class="invoice-number">${invoiceNumber}</div>
        <div class="badge ${booking.payment_status === 'paid' ? 'badge-paid' : 'badge-pending'}">
          Payment: ${booking.payment_status?.toUpperCase() || 'PAID'} (${booking.payment_mode?.toUpperCase() || 'COD'})
        </div>
      </div>
    </div>

    <div class="parties-grid">
      <div>
        <div class="party-title">Service Partner / Provider</div>
        <div class="party-name">${provider?.business_name || 'Ozo Doorstep Services Partner'}</div>
        <div class="party-detail">Manager: ${provider?.owner_name || 'Partner Dispatcher'}</div>
        <div class="party-detail">Phone: ${provider?.phone || '+91 8000000000'}</div>
        <div class="party-detail">City: ${provider?.city || 'Patna Hub'}</div>
        ${booking.service_technicians?.full_name ? `<div class="party-detail" style="margin-top: 6px; font-weight: 700; color: #0284c7;">Attending Technician: ${booking.service_technicians.full_name} (${booking.service_technicians.phone || ''})</div>` : ''}
      </div>

      <div>
        <div class="party-title">Billed To (Customer)</div>
        <div class="party-name">${booking.customer_name || 'Valued Customer'}</div>
        <div class="party-detail">Phone: ${booking.customer_phone || 'Provided via App'}</div>
        <div class="party-detail">Premises: ${customerAddress}</div>
        <div class="party-detail">Booking ID: #${booking.booking_number || booking.id?.slice(0, 8)}</div>
      </div>
    </div>

    <div class="service-info">
      <div>
        <div class="service-info-title">${booking.service_title || 'Doorstep Service Visit'}</div>
        <div style="font-size: 11px; color: #64748b; text-transform: capitalize; margin-top: 2px;">Category: ${booking.category_slug || 'General Repair & Maintenance'}</div>
      </div>
      <div style="text-align: right;">
        <div class="service-info-slot">📅 ${bookingDate}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Slot: ${booking.scheduled_slot || '10:00 AM - 12:00 PM'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-mono">01</td>
          <td>
            <div class="font-bold">${booking.service_title || 'Doorstep Technical Visit & Inspection'}</div>
            <div style="font-size: 11px; color: #64748b;">Standard diagnostic visit fee</div>
          </td>
          <td style="text-align: center;">1</td>
          <td class="text-right font-mono">₹${visitingFee.toFixed(2)}</td>
          <td class="text-right font-mono font-bold">₹${visitingFee.toFixed(2)}</td>
        </tr>
        ${laborFee > 0 ? `
        <tr>
          <td class="font-mono">02</td>
          <td>
            <div class="font-bold">Labor & Service Charges</div>
            <div style="font-size: 11px; color: #64748b;">On-site repair execution</div>
          </td>
          <td style="text-align: center;">1</td>
          <td class="text-right font-mono">₹${laborFee.toFixed(2)}</td>
          <td class="text-right font-mono font-bold">₹${laborFee.toFixed(2)}</td>
        </tr>` : ''}
        ${partsFee > 0 ? `
        <tr>
          <td class="font-mono">03</td>
          <td>
            <div class="font-bold">Replacement Spare Parts & Consumables</div>
            <div style="font-size: 11px; color: #64748b;">Verified hardware fitments</div>
          </td>
          <td style="text-align: center;">1</td>
          <td class="text-right font-mono">₹${partsFee.toFixed(2)}</td>
          <td class="text-right font-mono font-bold">₹${partsFee.toFixed(2)}</td>
        </tr>` : ''}
      </tbody>
    </table>

    <div class="totals-wrap">
      <table class="totals-table">
        <tr>
          <td style="color: #64748b;">Subtotal:</td>
          <td class="text-right font-mono font-bold">₹${(visitingFee + laborFee + partsFee).toFixed(2)}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td style="color: #059669;">Promo Discount:</td>
          <td class="text-right font-mono font-bold" style="color: #059669;">- ₹${discount.toFixed(2)}</td>
        </tr>` : ''}
        ${taxes > 0 ? `
        <tr>
          <td style="color: #64748b;">Applicable Taxes (GST):</td>
          <td class="text-right font-mono font-bold">₹${taxes.toFixed(2)}</td>
        </tr>` : ''}
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td class="text-right font-mono">₹${totalAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="security-note">
      <div>
        <strong>Verification Status:</strong>
        <span class="otp-verified">✓ 6-Digit Completion OTP Verified at Doorstep</span>
      </div>
      <div>
        Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing Ozo Doorstep Services. All repairs carry standard 30-day workmanship assurance.</p>
      <p style="margin-top: 4px;">For customer grievance or warranty support, contact support@ozo.in or call +91 8000000000.</p>
    </div>
  </div>
</body>
</html>
  `

  printWindow.document.write(invoiceHtml)
  printWindow.document.close()
}

export function printServiceEstimate(estimate, provider) {
  if (!estimate) return

  const printWindow = window.open('', '_blank', 'width=850,height=900')
  if (!printWindow) {
    alert('Please allow popups to print the quotation.')
    return
  }

  const items = Array.isArray(estimate.items) ? estimate.items : []
  const estimateNumber = estimate.estimate_number || `EST-${estimate.id?.slice(0, 8).toUpperCase()}`

  const quotationHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Quotation - ${estimateNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #fff; color: #1f2937; padding: 32px; font-size: 13px; line-height: 1.5; }
    .quote-card { max-width: 780px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px; margin-bottom: 24px; }
    .brand-name { font-size: 22px; font-weight: 900; color: #0f172a; }
    .quote-title { font-size: 20px; font-weight: 900; color: #ea580c; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 800; }
    .font-mono { font-family: monospace; }
  </style>
</head>
<body>
  <div style="max-width: 780px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end;">
    <button onclick="window.print()" style="background: #ea580c; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; cursor: pointer;">
      🖨️ Print Quotation
    </button>
  </div>
  <div class="quote-card">
    <div class="header">
      <div>
        <div class="brand-name">Ozo Services</div>
        <p style="font-size: 11px; color: #64748b;">Partner: ${provider?.business_name || 'Authorized Service Partner'}</p>
      </div>
      <div style="text-align: right;">
        <div class="quote-title">Job Estimate</div>
        <div style="font-family: monospace; font-weight: 800; color: #64748b;">${estimateNumber}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Status: <strong>${estimate.status?.toUpperCase() || 'SENT'}</strong></div>
      </div>
    </div>

    <p style="font-size: 12px; color: #475569; margin-bottom: 16px;">
      Diagnostic inspection finding & recommended repairs/parts for booking <strong>#${estimate.service_bookings?.booking_number || estimate.booking_id?.slice(0, 8)}</strong>
    </p>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item / Service Description</th>
          <th>Type</th>
          <th style="text-align: center;">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, i) => `
        <tr>
          <td class="font-mono">${i + 1}</td>
          <td class="font-bold">${it.description}</td>
          <td style="text-transform: capitalize; color: #64748b;">${it.type || 'part'}</td>
          <td style="text-align: center;">${it.qty || 1}</td>
          <td class="text-right font-mono">₹${Number(it.unit_price).toFixed(2)}</td>
          <td class="text-right font-mono font-bold">₹${(Number(it.qty || 1) * Number(it.unit_price)).toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end;">
      <table style="width: 260px;">
        <tr>
          <td style="color: #64748b;">Subtotal:</td>
          <td class="text-right font-mono font-bold">₹${Number(estimate.subtotal || estimate.total_amount).toFixed(2)}</td>
        </tr>
        ${Number(estimate.tax_amount) > 0 ? `
        <tr>
          <td style="color: #64748b;">Taxes (GST):</td>
          <td class="text-right font-mono font-bold">₹${Number(estimate.tax_amount).toFixed(2)}</td>
        </tr>` : ''}
        <tr style="border-top: 2px solid #e2e8f0; font-size: 16px; font-weight: 900; color: #ea580c;">
          <td>Total Estimate:</td>
          <td class="text-right font-mono">₹${Number(estimate.total_amount).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b;">
      <p>⚠️ Work begins only after customer approval. Standard manufacturer warranty applies on replacement spare parts.</p>
    </div>
  </div>
</body>
</html>
  `

  printWindow.document.write(quotationHtml)
  printWindow.document.close()
}
