/**
 * Email templates for order notifications.
 */

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
}

interface OrderConfirmationData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  total: string;
  items: OrderItem[];
}

export function orderConfirmationEmail(data: OrderConfirmationData) {
  const itemRows = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333">${item.name}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:center">${item.quantity}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right">$${item.price}</td>
        </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    
    <!-- Header -->
    <div style="background:#dc2626;border-radius:12px 12px 0 0;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">PokeCitizen Collectibles</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Order Confirmation</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:32px 24px;border-radius:0 0 12px 12px">
      
      <p style="font-size:16px;color:#333;margin:0 0 8px">Hi ${data.customerName},</p>
      <p style="font-size:14px;color:#666;margin:0 0 24px">
        Thanks for your order! We've received your payment and are preparing your items for shipment.
      </p>

      <!-- Order number -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Order Number</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#111">#${data.orderId}</p>
      </div>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase">Item</th>
            <th style="padding:10px 16px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase">Qty</th>
            <th style="padding:10px 16px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:16px;font-size:16px;font-weight:bold;color:#111">Total</td>
            <td style="padding:16px;font-size:16px;font-weight:bold;color:#dc2626;text-align:right">$${data.total}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Shipping -->
      <div style="margin-bottom:24px">
        <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Shipping To</p>
        <p style="margin:4px 0 0;font-size:14px;color:#333">${data.shippingAddress || 'Address provided at checkout'}</p>
      </div>

      <!-- What's next -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;font-weight:600;color:#dc2626">What's next?</p>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#666;line-height:1.8">
          <li>Your items will be carefully packaged in sleeves & top loaders</li>
          <li>You'll receive a shipping confirmation with tracking within 24 hours</li>
          <li>Free shipping on orders over $50</li>
        </ul>
      </div>

      <p style="font-size:13px;color:#9ca3af;margin:0;text-align:center">
        Questions? Reply to this email and we'll help you out.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px">
      <p style="font-size:11px;color:#9ca3af;margin:0">
        © ${new Date().getFullYear()} PokeCitizen Collectibles. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Order Confirmation — PokeCitizen Collectibles

Hi ${data.customerName},

Thanks for your order! We've received your payment and are preparing your items.

Order #${data.orderId}
Total: $${data.total}

Items:
${data.items.map((i) => `- ${i.name} (x${i.quantity}) — $${i.price}`).join('\n')}

Shipping to: ${data.shippingAddress || 'Address provided at checkout'}

What's next:
- Items packaged in sleeves & top loaders
- Shipping confirmation within 24 hours

Questions? Reply to this email.

— PokeCitizen Collectibles
`;

  return { html, text };
}
