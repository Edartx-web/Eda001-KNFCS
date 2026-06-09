# KNFC Fried Chicken — User Manual

**Version 2.1 | June 2026**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Customer Guide](#2-customer-guide)
3. [Staff Guide](#3-staff-guide)
4. [Branch Admin Guide](#4-branch-admin-guide)
5. [Super Admin Guide](#5-super-admin-guide)
6. [WhatsApp Setup](#6-whatsapp-setup)
7. [Site Configuration Reference](#7-site-configuration-reference)
8. [Deployment Reference](#8-deployment-reference)
9. [Cloud Deployment (Render.com)](#9-cloud-deployment-rendercom)
10. [Glossary](#10-glossary)

---

## 1. System Overview

KNFC Fried Chicken is a multi-branch food ordering and Point-of-Sale (POS) system. It serves four distinct user roles:

| Role | Login Method | Home Page |
|------|-------------|-----------|
| **Customer** | Phone number + WhatsApp OTP | `/menu` |
| **Staff** | User ID + Password | `/staff/queue` |
| **Branch Admin** | Email + Password | `/admin/dashboard` |
| **Super Admin** | Email + Password | `/superadmin/dashboard` |

### Key Capabilities at a Glance

- Customers browse the full menu across all branches, place orders, track status in real time, earn loyalty points, play the Spin Wheel and Scratch Card games, and apply coupons
- Staff manage the live order queue, handle UPI payment confirmation, manage stock, and create walk-in orders
- Branch Admins manage stock, offers, orders, payment records, and their branch staff
- Super Admins control all branches, global configuration, WhatsApp broadcasts, analytics, login-page branding, and all offer types

### Production URLs

| Service | URL | Local port |
|---------|-----|-----------|
| **React Frontend** | https://knfcs.com | 3000 |
| **Django Backend API** | https://api.knfcs.com | 1000 |
| **WhatsApp Service** | https://wa.knfcs.com | 1000 |

All three are served via Cloudflare Tunnel — no Nginx required.

---

## 2. Customer Guide

### 2.1 Getting Started

#### Registering an Account

1. Open the KNFC app or website.
2. On the login screen, tap **Customer Login**.
3. Enter your mobile phone number and tap **Send OTP**.
4. Open WhatsApp — you will receive a 6-digit OTP message.
5. Enter the OTP on the verification screen.
6. If you are a new customer, enter your name when prompted and tap **Register**.
7. You are now logged in and taken to the home page.

> Your phone number is your permanent username. Keep it active for future logins.

> **Important:** Your account is only created after OTP verification. Entering a number without completing verification does not register an account.

#### Selecting Your Branch

When you first open the app, you can browse the full menu across all branches without selecting one. A branch selection is only required when you are ready to place an order.

- When you tap **Place Order**, the system checks stock at the selected branch and shows which branches have your items available.
- To manually change your branch, tap the **Branch chip** inside the Order Summary panel on the cart page.

---

### 2.2 Home Page

The home page is your starting point. It shows:

| Section | Description |
|---------|-------------|
| **Active Order Strip** | If you have an in-progress order, a live status strip appears at the top. Tap it to jump to tracking. |
| **Today's Offers** | Currently active promotions and deals. |
| **Hot Deals** | Special discounted items highlighted by the branch. |
| **Popular Picks** | Bestsellers and newly added items. |
| **Categories** | A grid of all menu categories with images. |

---

### 2.3 Browsing the Menu

#### Menu Display

The full menu is shown across all branches. Items show:
- Image, name, price, and dietary badge (veg / non-veg / vegan)
- **Measurement unit chip** — a white frosted-glass pill overlaid at the bottom-right corner of the product image (e.g., "500 g", "2 pcs", "1 L"). This chip is hidden when the item is running low and the **Hurry!** badge takes priority.
- A stock indicator when you have a branch selected

#### Filters and Sorting

On the menu or search page, use the filter bar to narrow results:
- **Dietary** — Veg, Non-Veg, Vegan
- **Price Range** — Set minimum and maximum price
- **Availability** — Hide out-of-stock items
- **Sort** — By popularity, price (low to high / high to low), or rating

#### Product Detail Page

Tap any item card to open its detail page, which shows:
- Full image gallery (swipe to see more photos)
- Price and discount percentage (if a sale is active)
- Dietary type icon, spice level, and measurement quantity
- Estimated preparation time
- **Customisation options** — selectable add-ons (e.g., Extra Sauce +₹20)
- **Special Instructions** — a free-text field for specific requests
- Customer reviews with photos

#### Adding to Cart

1. On the product detail page, select any customisation options.
2. Type any special instructions if needed.
3. Use the **−** and **+** buttons to set the quantity.
   - The **+** button is disabled once you reach the item's remaining stock. You cannot add more than what is available.
4. Tap **Add to Cart**.
5. The floating cart button shows your item count and total.

---

### 2.4 Search

1. Tap the **Search** icon.
2. Type any part of an item name or description.
3. Results appear in real time. Apply filters to refine them.
4. Tap any result to open its detail page.

---

### 2.5 Cart and Checkout

#### Reviewing Your Cart

Tap the cart button to open your cart. You will see:

- Each item with its image, name, applied customisations, quantity controls, and line total (at discounted price)
- **Subtotal** — the original (MRP) total of all items before any item-level discounts
- **Item discounts** — savings from per-item discounts already applied to the prices (shown in green)
- **Offer / Coupon discount** — savings from a separately applied offer or coupon code
- **Loyalty discount** — savings from redeemed loyalty points
- **Spin Wheel discount** — savings won from the Spin Wheel game
- **Taxes & fees** — Included (all prices are inclusive of taxes)
- **Total** — the final amount you pay

> **How the discount rows work:** If an item has a discounted price (e.g., Fish Finger ₹100 discounted from ₹109), the Subtotal shows ₹218 (original), Item discounts shows −₹18, and the Total correctly shows ₹200. The maths is always transparent.

#### Applying a Coupon Code

1. In the cart, locate the **Coupon Code** field under **Browse offers**.
2. Type your code and tap **Apply**.
3. If valid, the discount is shown immediately and the total updates.
4. Only one discount type (offer, coupon, or spin wheel) can be active at a time.

#### Redeeming Loyalty Points

If you have enough points and the loyalty programme is enabled:
1. A **Loyalty Points** row appears in the cart showing your available points.
2. Tap **Use X pts** to apply them.
3. The equivalent rupee value is deducted from your total.
4. Tap the **×** on the applied points row to remove them.

#### Spin Wheel Discount

If you won a percentage discount on the Spin Wheel or Scratch Card:
- The discount appears automatically as a chip in the cart.
- It is paused if you also apply a coupon — remove the coupon to use the spin discount, or vice versa.
- Tap **×** on the chip to remove it.

#### Choosing Order Type

- **Dine-In** — Eating at the branch. Enter your **table number** when prompted.
- **Pickup** — Takeaway. Collect your order at the counter.

The order type selector only shows options the branch currently accepts (e.g., if the branch is Pickup only, only Pickup is shown).

#### Placing the Order

1. Tap **Place Order**.
2. If no branch is selected, a branch picker opens automatically — select a branch and the system checks stock availability.
3. Select your **payment method**: Cash or UPI.

**Cash payment:**
- Tap **Place Order · ₹XX →**
- You are taken directly to the Order Confirmation page.
- Pay at the counter when your order is ready.

**UPI payment:**
- Tap **Place Order · ₹XX →**
- You are taken to the **Awaiting Payment** page (see Section 2.6 below).
- You must complete payment before the order is confirmed.

---

### 2.6 UPI Payment — Awaiting Payment Page

After placing a UPI order, you land on the **Awaiting Payment** screen. This is a secure payment gate — you cannot skip it to the confirmation page.

#### What the Page Shows

| Element | Description |
|---------|-------------|
| **Order amount** | Total you need to pay |
| **Token number** | Your order token (e.g., #45) |
| **Countdown timer** | 5-minute animated ring that turns amber under 1 minute and red under 20 seconds |
| **GPay button** | Taps open GPay and pre-fills the payment amount |
| **PhonePe button** | Taps open PhonePe and pre-fills the payment amount |
| **Show QR Code** | Expands the branch UPI QR code for scanning at the counter |

#### Payment Flow

1. Tap **GPay** or **PhonePe** — the respective app opens with amount pre-filled.
2. Complete the payment in the app.
3. Return to the KNFC page — it automatically checks every 5 seconds.
4. When staff confirms the payment, the page shows **Payment confirmed!** and redirects to your Order Confirmation.

#### 5-Minute Timeout

- If payment is not confirmed by staff within 5 minutes, the order is **automatically cancelled**.
- The timer turns red and shakes at under 20 seconds.
- The reason for cancellation is shown on the cancelled screen.
- If staff cancels your order for any other reason (e.g., item out of stock), the specific reason is displayed with a note from staff.

#### Cancelling Manually

Tap **Cancel this order** at the bottom of the page, confirm the prompt, and the order is cancelled immediately.

---

### 2.7 Order Tracking

#### Active Order Strip (Home Page)

While an order is being prepared, a coloured strip at the top of the home page shows the current status. Tap it to go directly to the tracking page.

#### Order Detail Page

The order detail page shows:
- Token number and order type
- Item list with quantities and customisations
- Status timeline with timestamps: **Placed → Confirmed → Preparing → Ready → Completed**
- Payment method and payment status (Pending / Paid)

#### Invoice Page

After an order is completed, tap **View Invoice** from the Order Confirmation or Order History page. The invoice shows:
- KNFC logo header
- Full itemised bill with line totals
- Discount applied (if any)
- Amount in words
- Payment method and UPI reference
- Staff and customer details
- All taxes included notice
- KNFC Support contact details at the bottom

> The invoice page does not show any site navigation or footer — it is a clean, print-ready document.

---

### 2.8 Loyalty Programme

- You earn points automatically on every paid order.
- The earn rate is set by the Super Admin (e.g., 1 point per ₹1 spent).
- Redeem points directly from the cart.
- Your points balance is shown on your Account page.
- Walk-in orders (without a customer account) do not earn points.

---

### 2.9 Offers and Promotions

#### Browsing Offers

1. Tap **Offers** in the navigation.
2. Active promotions are shown as cards with discount type, image, and description.
3. Use the filter pills to view **All**, **Active**, or **Ending soon** offers.
4. Tap any offer card to see its full details.

#### Lucky Games (Spin Wheel and Scratch Card)

At the top of the Offers page, if the Super Admin has enabled them, two game options appear:

**Spin Wheel:**
1. Tap the **Spin Wheel** tab.
2. Tap **Launch Spin Wheel** — a full-screen overlay opens.
3. Tap **SPIN THE WHEEL** or tap the wheel directly.
4. The wheel decelerates and lands on a prize segment.
5. Prizes include percentage discounts, free items, or "Try Again".
6. If you win a discount, it is applied to your cart automatically.
7. The spin count is controlled by the admin (e.g., 1 spin per day).

> **Wheel design:** Each segment uses a distinct gradient colour, gold metallic outer ring, and a decorative pointer arrow. Winning triggers a confetti burst from the wheel.

**Scratch Card:**
1. Tap the **Scratch Card** tab.
2. Tap **Scratch Your Card** — a full-screen scratch card overlay opens.
3. Scratch the gold foil with your finger (or mouse).
   - Gold spark particles appear as you scratch.
   - A hint finger icon appears until 30% is scratched.
4. Once 55% is revealed, the coupon explodes into view with 180 confetti particles.
5. Copy the revealed code using the **Copy code** button.
6. Enter the code in the cart's coupon field to redeem your discount.
7. Tap **Close and go to cart** to proceed.

> **When both games are enabled:** Tap the tab to switch between Spin Wheel and Scratch Card. Only one game discount can apply per order.

#### Offer Types

| Type | How discount works |
|------|--------------------|
| **Percentage** | A % off the qualifying cart subtotal (e.g., 20% off) |
| **Flat** | A fixed rupee amount off (e.g., ₹50 off) |
| **Welcome Bonus** | A fixed ₹ discount for first-time customers only (auto-applied from `welcome_bonus_amount`) |
| **Combo** | A bundled deal for specific items purchased together |
| **Buy X Get Y Free** | One free item when conditions are met |
| **BOGO** | Buy-one-get-one free |
| **Referral** | Share a link → earn a reward when a friend places their first qualifying order |
| **Re-engagement** | Sent via WhatsApp to customers who have not ordered in X days |
| **Scratch Card** | Coupon revealed by the scratch card game |

---

### 2.10 Account Page

Access your account by tapping the **Profile** icon:

| Section | What you can do |
|---------|----------------|
| **Profile** | View your name and phone number |
| **Loyalty Points** | See your balance and redemption terms |
| **Order History** | Browse all past orders and tap to view invoices |
| **Favourites** | View and manage saved items |
| **Support Tickets** | View tickets you have submitted and admin replies |

---

### 2.11 Support / Help

1. From the Account page, tap **Support** or **Contact Us**.
2. Fill in the subject and describe your issue.
3. Attach a photo if relevant (optional).
4. Tap **Submit**.
5. Track the status of your ticket under **Account → Support Tickets**.
6. Admin replies appear on the ticket detail page.

---

## 3. Staff Guide

Staff log in with a **User ID** and **Password** assigned by the Branch Admin. After login, they are taken to the Order Queue.

> Staff can only access data for their assigned branch.

---

### 3.1 Order Queue (Live KDS)

The Queue page is the primary workflow screen. It updates live via WebSocket (with HTTP fallback every 15 seconds). On mobile, the layout switches to a single-column view with full-width action buttons for easy one-tap operation.

#### Reading the Queue Cards

Each order card shows:

| Element | Description |
|---------|-------------|
| **Token Number** | Large orange badge (e.g., #45) |
| **Status badge** | Current stage: Placed / Confirmed / Preparing / Ready |
| **Elapsed time** | Minutes since order was placed — turns amber at 15+ minutes |
| **Carried-Over badge** | Red badge if this order came from a previous day |
| **Customer name** | With a tap-to-call phone link for walk-in customers |
| **Order type** | Dine-in (Table X) or Pickup |
| **Items list** | Each item with quantity, with horizontal scroll on mobile |
| **Total amount** | With UPI payment status badge |

#### UPI Orders — Mark Paid Before Confirming

If an order was placed with UPI payment:

1. The card shows a **gold banner** at the top: **"UPI payment pending — verify before confirming"**
2. A green **Mark Paid** button is in the banner.
3. **You cannot tap Confirm until payment is marked paid.** The Confirm button is hidden and replaced by Mark Paid.

**Mark Paid workflow:**
1. Verify the payment on your UPI app or Google Pay / PhonePe device.
2. Tap **Mark Paid** on the card or banner.
3. A modal opens — optionally enter the customer's UPI transaction reference.
4. Tap **Confirm Payment**.
5. The card now shows the **Confirm** button — proceed with the normal order flow.

> This prevents confirming and cooking orders when the customer has not actually paid.

#### Progressing an Order

After payment is confirmed (or for cash orders), use the status buttons:

1. **Confirm** — Acknowledge you have seen the order
2. **Start Cooking** — You have begun preparing it
3. **Mark Ready** — Food is ready for pickup or table service
4. **Complete** — Order handed to the customer

#### Printing a KOT

Tap **KOT** on any order card to print a Kitchen Order Ticket on the connected 80 mm thermal printer.

#### Cancelling an Order

1. Tap **Cancel** on the order card.
2. Select a reason from the predefined list:
   - Customer requested cancellation
   - Item(s) out of stock
   - Customer unwilling to wait
   - Duplicate / accidental order
   - Payment not received
3. Add an optional note with more detail.
4. Confirm.

> **The cancellation reason is shown to the customer** on their Awaiting Payment page (for UPI orders) so they know exactly why.

#### Queue Auto-Cancel Rules

Orders are automatically cancelled by the system in two cases:
- **UPI orders** — cancelled if payment is not confirmed within **5 minutes** of placing the order
- **All other orders** — cancelled if not confirmed by staff within **30 minutes**

Staff will see these orders disappear from the queue when the auto-cancel runs.

#### Stats Dashboard

Above the queue, four stat cards show (responsive 2-col grid on mobile, 4-col on desktop):
- **In queue** — live count
- **Done today** — completed orders
- **Revenue** — total collected today
- **Stock alerts** — items needing attention

---

### 3.2 Stock Management (Staff)

> **Note:** Staff can view stock levels but cannot update stock directly. Only Branch Admins and Super Admins can set opening stock or add top-ups.

The Staff Stock tab gives a real-time read-only view of today's stock:

| Indicator | Meaning |
|-----------|---------|
| **Green** | Sufficient stock |
| **Orange** | Approaching the low-stock threshold |
| **Red** | Very low — order soon |
| **Grey** | Zero stock — item unavailable for ordering |

---

### 3.3 New Order (POS / Walk-In)

Staff can create orders on behalf of walk-in customers who do not have the app.

1. Go to **New Order** from the staff navigation.
2. The screen splits into:
   - **Left** — Menu grid (browse by category, search, tap to add items)
   - **Right** — Order summary panel
3. In the order summary panel:
   - Enter the customer's **name** and **phone number** (10-digit Indian mobile number required)
   - Select **order type**: Dine-In (enter table number) or Pickup
   - Review items, quantities, and totals
4. Tap **Place Order**.
5. Select payment method and confirm.

> Walk-in orders placed by staff bypass the 5-minute UPI payment gate — staff handle payment collection directly.

---

### 3.4 Session and On-Duty Status

- When you log in, you are marked as **On Duty**.
- The system tracks your login time and location (where permission is granted).
- If there is no activity for 60 minutes, an idle warning appears in the system.
- Your Branch Admin and Super Admin can view your session history, login/logout times, and orders completed.

---

## 4. Branch Admin Guide

Branch Admins log in with an **email address and password**. They manage one branch: its stock, offers, orders, payment records, and staff.

> Branch Admins cannot add or edit global menu items, access analytics dashboards, or send WhatsApp broadcasts. These are Super Admin only.

---

### 4.1 Dashboard

Shows an overview of branch performance:

| Widget | Description |
|--------|-------------|
| **Today's Revenue** | Total sales so far today |
| **Order Count** | Orders placed today |
| **Avg Order Value** | Average spend per order |
| **Top 5 Items** | Best-selling items this month |
| **Recent Orders** | Last 10 orders with status |
| **Stock Alerts** | Items running low or out |
| **Staff On Duty** | Staff currently logged in |

---

### 4.2 Orders (Admin View)

Navigate to **Admin → Orders** to view all orders for your branch. Use filters for status, date range, payment status, and order type.

From any order detail page:
- Update status
- **Mark payment as paid or waived** (for UPI orders awaiting confirmation)
- Cancel with a reason and note
- Export as CSV

#### Handling UPI Payments

For any UPI order still showing **payment status: Pending**:
1. Open the order detail.
2. Tap **Mark as Paid**.
3. Enter the UPI transaction reference if available.
4. Confirm.

This triggers the customer's Awaiting Payment page to redirect to their confirmation automatically.

---

### 4.3 Stock Management (Admin)

Navigate to **Admin → Stock** for a comprehensive inventory view.

#### Setting Opening Stock

1. Tap **Set Opening Stock** at the top of the stock page.
2. A full-page panel opens showing all menu items.
3. The panel header (**Save all** + **Cancel** buttons) stays **sticky** at the top while you scroll.
4. For each item, tap a quick preset (**10 / 20 / 30**) or type a custom quantity.
5. A counter shows how many items have been filled (e.g., "12 of 38 filled").
6. Tap **Set** on individual rows to save one at a time, or **Save all (N)** to save everything at once.
7. When all items are saved, the panel closes and stock cards refresh.

> Set opening stock once per day, before the branch opens.

#### Adding Mid-Day Top-Ups

1. Tap **Add Stock** on any item card.
2. Choose a quick quantity preset or enter a custom amount.
3. Tap **Add**. Stock updates immediately.

#### Stock Activity Log

View a complete history of all stock changes:
- Time, item, type (Opening / Top-Up / Carryover / Rollback / Lock / Waste), before/change/after counts, and who made the change
- Use the **date picker** to view logs for any past day

#### Locking Stock

Tap **Lock Today** to freeze the current day's stock record:
- No further changes possible after locking
- A snapshot is saved for reporting
- Only Super Admin can unlock

#### Rollback / Carryover

- Toggle **Carries Over** on any item card to include/exclude yesterday's remaining stock in today's opening.
- Tap **Rollback** to request a carryover from yesterday's pending stock.

---

### 4.4 Offers Management

Navigate to **Admin → Offers** to view the offers list.

> Branch Admins have **read-only** access to offers — they can browse and view redemption details but cannot create or edit offers. All offer creation is done by Super Admin.

---

### 4.5 Staff Management

Navigate to **Admin → Staff** to create and manage staff accounts.

#### Creating a Staff Account

1. Tap **Add Staff** and fill in name, email, login User ID, password, and branch.
2. Tap **Create**.
3. The system generates a unique Staff Username automatically.

#### Managing Existing Staff

Tap any staff member to view their profile, on-duty status, session history, login/logout times, and completion stats — or to deactivate them.

---

### 4.6 Payment Records

Navigate to **Admin → Orders → Payment Logs** to see a full log of all payments:

| Column | Description |
|--------|-------------|
| **Time** | When the payment was marked |
| **Token** | Order token number |
| **Method** | Cash / UPI / Card |
| **Amount** | Total amount |
| **Status** | Paid / Waived |
| **Pay Ref** | UPI transaction reference or serial number (e.g., PAY001) |
| **Marked by** | Staff or admin name |

Export the full log as CSV.

---

## 5. Super Admin Guide

Super Admins have full access to all branches and system-wide configuration.

---

### 5.1 Super Admin Dashboard

Shows aggregated data across all branches: revenue charts, customer counts, top items, offer performance, broadcast history, staff leaderboard, and system health status.

Use the **Branch Filter** to scope any widget to a specific branch.

---

### 5.2 Multi-Branch Menu Management

Create menu items and categories with the **All Branches** toggle ON to make them visible at every branch. Branch-specific items use the toggle OFF.

---

### 5.3 Offers Management

Navigate to **Super Admin → Offers** to create and manage all promotions.

#### Creating an Offer

Tap **Add Offer** and fill in:
- **Identity** — name, tagline, offer type, emoji, gradient colours, accent colour
- **Discount** — percentage, flat amount, or welcome bonus amount (depending on type)
- **Media** — offer poster image, video (MP4), and video thumbnail
- **Schedule** — start date, end date (optional for lifetime offers), active toggle, carousel order
- **Scope** — apply to specific category only, or specific items only (leave both empty for all items)
- **Eligibility** — minimum order value, maximum redemptions per customer, first order only toggle
- **Coupon Code** — set a code customers must enter in cart to claim this offer
- **All Branches toggle** — make this offer visible to all branches

Tap **Save Offer**.

#### Offer Types Detail

| Type | Key fields |
|------|-----------|
| **Percentage** | `discount_percentage` — e.g., 20 for 20% off |
| **Flat** | `discount_flat` — e.g., 50 for ₹50 off |
| **Welcome Bonus** | `welcome_bonus_amount` — flat ₹ for first-time customers (auto-applied, once per account) |
| **Combo** | Add specific items in the Combo Items section |
| **Referral** | Set referral reward type (coupon / scratch / direct discount) and reward value |
| **Re-engagement** | Set inactive days threshold and custom WhatsApp message with placeholders |
| **Scratch Card** | Configured via Site Settings (not as a standalone offer) |

> The Welcome Bonus uses `welcome_bonus_amount` — ensure this field is filled (not `discount_flat`) for the bonus to apply correctly to customer carts.

#### Offer Performance

Each offer card shows view count and redemption count. Tap **View Redemptions** for a full list with customer names, order IDs, and savings.

---

### 5.4 WhatsApp Setup

The KNFC system uses two WhatsApp numbers:

| Number | Purpose |
|--------|---------|
| **OTP Number** | Sends one-time passwords to customers during login |
| **Broadcast Number** | Sends promotional offers, custom messages, and customer bill invoices after order completion |

#### Connecting a WhatsApp Number

1. Navigate to **Super Admin → WhatsApp**.
2. Locate the session card and tap **Scan QR**.
3. On the phone: WhatsApp → Settings → Linked Devices → Link a Device.
4. Scan the QR code. Status updates to **Connected** within seconds.

#### Status Indicators

| Status | Meaning |
|--------|---------|
| **Connected** | Ready and active |
| **Scan QR** | Requires a fresh scan |
| **Disconnected** | Logged out — rescan to reconnect |
| **Service Down** | Node.js WhatsApp service not running — restart required |

> If the service disconnects, an alert email is sent automatically to the Super Admin's registered address.

---

### 5.5 Broadcast Management

Navigate to **Super Admin → Broadcast**.

#### Offer Broadcast

1. Tap **New Broadcast → Offer Broadcast**.
2. Select an active (non-expired) offer. Edit the auto-generated caption if needed.
3. Optionally attach a separate image.
4. Select target (All Branches or Specific Branch).
5. Tap **Send Now**.

> Only active offers can be broadcast. Expired offers are hidden from the list.

#### Custom Message

1. Tap **New Broadcast → Custom Message**.
2. Write message text. Optionally attach an image.
3. Select target and tap **Send Now**.

#### Auto-Broadcast

If an offer has **Auto-broadcast** enabled, a broadcast is automatically queued when the offer is activated or updated.

#### Broadcast History

Each broadcast shows title, status (Pending → Running → Done / Failed), progress bar, and created-by. Tap **Retry** to re-queue a failed broadcast.

---

### 5.6 Site Configuration

Navigate to **Super Admin → Settings** to adjust global system behaviour.

#### Loyalty Programme

| Setting | Description |
|---------|-------------|
| **Enabled** | Master switch for the loyalty programme |
| **Earn Rate** | Points per ₹1 spent (e.g., 1.0 = 1 pt/₹1) |
| **Redeem Rate** | ₹ value per point (e.g., 0.10 = 100 pts = ₹10) |
| **Minimum Redeem** | Minimum points before redemption is allowed |
| **Redeem Step** | Points must be redeemed in multiples of this number |
| **Max Redeem %** | Maximum % of order total payable with points |

#### Spin-the-Wheel Game

| Setting | Description |
|---------|-------------|
| **Enabled** | Show/hide the spin wheel for customers on the Offers page |
| **Max Spins per Day** | Per customer — 0 = unlimited |
| **Prizes** | Each prize has: label text, emoji, hex colour, probability %, and discount % |

Use the **+ Add prize** button to add segments. The probability total is shown live and should equal 100%.

> **Spin Wheel design (v2.0):** The wheel uses radial gradient segments (dark centre to bright rim), a gold metallic outer ring with rim dots, a metallic centre hub, and a glowing pointer arrow. Winning triggers a confetti burst from the wheel's position. The prize winner card shows a shimmer gold animation.

#### Scratch Coupon

| Setting | Description |
|---------|-------------|
| **Enabled** | Show/hide the scratch card game on the Offers page |
| **Discount %** | Discount revealed when the card is fully scratched |
| **Max Uses per Day** | Per customer |
| **Coupon Code** | The code customers copy and enter in the cart to redeem |

> **Scratch Card design (v2.0):** The card is a full-screen overlay. The gold foil uses a multi-layer gradient with shimmer streaks. Scratching produces gold spark particles. On 55% reveal, 180 confetti particles explode from the card centre. A copy-code button with clipboard confirmation is shown after reveal.

#### Login Page Customisation

**Desktop Hero Video**
- Paste a direct `.mp4` URL, or click **Upload video** to upload a file.
- A mini preview is shown. Click **Remove** to restore the default video.

**Desktop Hero Image**
- Upload a photo (JPEG/PNG). If set, shown instead of the video.
- Priority: Image (if set) > Custom video (if set) > Built-in KNFC video.

**Mobile Swiper Slides**
The mobile login screen shows a full-screen image carousel. Each slide has:

| Field | Description |
|-------|-------------|
| **Headline word** | Large word on the slide (e.g., SMASH, CRAVE). Auto-uppercased. |
| **Subtitle** | Line below the word |
| **Dish image** | URL of food photo, or click **Upload** |
| **Accent colour** | Highlight colour for underline, dots, and logo background |
| **Background gradient** | CSS gradient for the slide background |

Controls: **▲ ▼** reorder, **×** delete, **+ Add slide** (maximum 6 slides).

#### Home Screen Section Panels

Controls the banner image and tagline above each themed section on the customer home page.

Sections: **Hot Deals**, **Chicken Items**, **Snacks**, **Cold Drinks**

For each section:
1. Current banner shown as a 160×90 thumbnail (if set).
2. **Paste URL** or **Upload** an image file.
3. **Remove** to clear (falls back to the first item's image in that section).
4. **Tagline** — short marketing text above the section.

Recommended banner size: **1200×400 px, landscape**.

#### Home Page Ads

Banner advertisements on the customer home page.

- Each ad has a title, image (upload or URL), and optional link.
- Toggle **Active / Hidden** without deleting.
- Tap **+ Add banner ad** to create a new one.

#### Re-engagement Offers

**Default inactive days** — pre-fills the "inactive after X days" field when creating a Re-engage offer.

#### Contact & Support

| Field | Where it appears |
|-------|-----------------|
| **Phone number** | Contact page and footer |
| **Support email** | Contact page |
| **WhatsApp number** | Chat support button (digits only with country code, e.g., 919876543210) |
| **Address** | Contact page and About page |

#### About, Blog, Careers Pages

All publicly visible pages are fully editable from Site Settings:
- **About** — headline, tagline, body content, hero image/video, and stats strip
- **Blog** — post cards with title, date, tag, image, and excerpt
- **Careers** — intro paragraph and individual job listings

#### Footer

| Setting | Description |
|---------|-------------|
| **Show map in footer** | Display a Google Maps embed in the desktop footer |
| **Map search query** | Google Maps search term (e.g., `KNFC+Fried+Chicken+Coimbatore`) |

#### Saving Settings

Tap **Save settings** at the bottom. Changes apply immediately to all users. A **Saved!** confirmation appears briefly.

---

### 5.7 Branch Management

Navigate to **Super Admin → Branches** to manage physical locations. Each branch record contains:
- Name, address, phone, email
- Operating hours (used for open/closed scheduling in IST)
- Max tables, UPI IDs (GPay UPI ID and PhonePe UPI ID), enable pickup/dine-in toggles
- Geolocation coordinates

---

### 5.8 User Management

Navigate to **Super Admin → Users** to manage all user types:

- **Create** Super Admin, Branch Admin, Staff, or Customer accounts
- **View** profile, order history, loyalty points, and session history per user
- **Deactivate** any account
- **Adjust** loyalty points manually
- **Reset** passwords
- **Search** by name, phone, or email

---

### 5.9 Analytics (Super Admin)

All branch-level analytics apply across all branches, plus:

| Report | Description |
|--------|-------------|
| **Revenue by Branch** | Compare performance across locations |
| **Top Items by Branch** | Best performers at each branch |
| **Customer Segments** | New, returning, and churned counts |
| **Offer ROI** | Views, redemptions, and total savings per offer |
| **Staff Performance** | Orders completed and average completion time per staff member |
| **Payment Methods** | Cash vs UPI vs Card split |

Export any report as CSV.

---

## 6. WhatsApp Setup

### Prerequisites

- Two active WhatsApp numbers (OTP + Broadcast)
- Node.js Baileys service running on port 3001
- Both numbers must NOT be logged into any other WhatsApp Web session

### Initial Setup Steps

1. Log in as Super Admin → **WhatsApp**.
2. Connect the **OTP number**: scan QR with the OTP phone.
3. Connect the **Broadcast number**: scan QR with the broadcast phone.
4. Confirm both show **Connected** status.
5. Go to **Settings → Site URL** and confirm `https://knfcs.com` is set.

### Ongoing Maintenance

- If a number shows **Disconnected**, rescan the QR immediately.
- WhatsApp may disconnect linked sessions after 14 days of phone inactivity on the linked phone.
- If **Service Down** appears, the Node.js service needs restarting.

### Keep-Alive (Render Free Tier)

The WhatsApp service pings its own `/health` endpoint every 13 minutes to prevent Render's free-tier 15-minute idle spin-down. This keeps the Baileys session continuously connected without interruption.

If a restart still occurs (e.g., after a deploy), the service restores the session from Supabase S3 automatically. The Django OTP sender will retry once after 10 seconds if it receives a 503 during the brief reconnect window — customers will not see an error in most cases.

### Automatic Notifications via WhatsApp (Broadcast Number)

The broadcast number automatically sends:
- Customer order invoice / bill immediately after an order is marked **Completed**
- OTP messages are sent via the OTP number

---

## 7. Site Configuration Reference

Quick reference for all SiteConfig settings (Super Admin → Settings):

| Setting | Default | Description |
|---------|---------|-------------|
| `loyalty_enabled` | true | Master switch for loyalty programme |
| `loyalty_earn_rate` | 1.0 | Points earned per ₹1 spent |
| `loyalty_redeem_rate` | 0.10 | ₹ value per point (100 pts = ₹10) |
| `loyalty_min_redeem` | 100 | Minimum points needed to redeem |
| `loyalty_redeem_step` | 100 | Redemption must be in multiples of this |
| `loyalty_max_redeem_pct` | 50 | Max % of order payable with points |
| `spin_enabled` | true | Show spin-the-wheel to customers |
| `spin_max_uses` | 1 | Spins per customer per day (0 = unlimited) |
| `spin_prizes` | [...] | Array of prize objects — label, emoji, color, prob, discount_pct |
| `scratch_enabled` | false | Show scratch coupon game |
| `scratch_discount_pct` | 15 | Discount % revealed by scratch card |
| `scratch_max_uses` | 1 | Scratch attempts per customer per day |
| `scratch_coupon_code` | SCRATCH15 | Coupon code revealed after scratch |
| `login_video_url` | — | Custom MP4 URL for desktop login hero video |
| `login_image` | — | Custom image for desktop login hero (overrides video) |
| `login_slides` | [...] | Mobile login carousel — word, sub, gradient, accent, img per slide |
| `home_section_images` | {...} | Banner image + tagline per home section |
| `home_ads` | [...] | Home page banner ads — title, image_url, link, active |
| `site_url` | — | Public app URL for WhatsApp links (e.g., https://knfcs.com) |
| `contact_phone` | — | Phone on Contact page and footer |
| `contact_email` | — | Support email on Contact page |
| `contact_wa_number` | — | WhatsApp support number (digits only with country code) |
| `contact_address` | — | Physical address on Contact and About pages |
| `about_headline` | — | Main heading on the About page |
| `about_tagline` | — | Short tagline under the headline |
| `about_content` | — | Body text / brand story |
| `about_image` | — | About page hero image |
| `about_video_url` | — | About page hero video URL |
| `about_stats` | [...] | Stat strip items — label, value (e.g., Branches / 3) |
| `blog_posts` | [...] | Blog post cards — title, date, tag, image_url, excerpt |
| `careers_intro` | — | Intro paragraph on the Careers page |
| `careers_openings` | [...] | Job listings — title, department, location, type, description, apply_email |
| `footer_show_map` | true | Show Google Maps embed in desktop footer |
| `footer_map_query` | — | Google Maps search query for footer embed |
| `reengagement_default_days` | 7 | Default inactive days for Re-engage offer creation |

---

## 8. Deployment Reference

This section covers running the KNFC system locally with Cloudflare Tunnel for public access.

### Architecture

```
Internet
    │
Cloudflare Edge (SSL)
    │
Cloudflare Tunnel (cloudflared)
    ├── knfcs.com      → localhost:3000   React dev server (npm start)
    ├── api.knfcs.com  → localhost:1000   Django / Daphne
    └── wa.knfcs.com   → localhost:1000   Django (WhatsApp webhook endpoints)
```

### Starting Django / Daphne

```powershell
$env:DJANGO_SETTINGS_MODULE = "config.settings.production"
python -m daphne -b 0.0.0.0 -p 1000 config.asgi:application
```

> Use `config.settings.development` for local-only development (enables DEBUG, in-memory cache/channels, relaxed CORS).

### Starting the React Dev Server

```powershell
cd frontend
npm start
```

For a production build (served statically):

```powershell
cd frontend
npm run build
```

### Starting the WhatsApp Service

```powershell
cd whatsapp-service
node index.js
```

### Starting Celery Worker and Beat

```powershell
# Worker (processes background tasks)
celery -A config worker -l info

# Beat (scheduled tasks — stock carryover, UPI auto-cancel, idle staff checks)
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

**Scheduled tasks:**

| Task | Schedule | Description |
|------|----------|-------------|
| `orders.auto_cancel_stale_orders` | Every 5 minutes | Cancels UPI orders unpaid after 5 min; cancels unconfirmed orders after 30 min |
| `stock.midnight_carryover` | 23:59 IST daily | Rolls remaining stock to next day, flags pending orders |
| `stock.check_stock_alerts` | Every 10 minutes | Creates low/out-of-stock alerts |
| `accounts.check_idle_staff` | Every 15 minutes | Flags staff sessions idle for 60+ minutes |
| `accounts.daily_duty_reminder` | 08:00 IST daily | Notifies admins of staff who have not logged in today |

### Starting Cloudflare Tunnel

```powershell
cloudflared tunnel run KNFCS
```

Configuration file: `C:\Users\Groti\.cloudflared\config.yml`

```yaml
tunnel: KNFCS
credentials-file: C:\Users\Groti\.cloudflared\<tunnel-id>.json
logfile: D:\Cloudflared\Account2\tunnel.log
log-level: info

ingress:
  - hostname: knfcs.com
    service: http://localhost:3000
  - hostname: api.knfcs.com
    service: http://localhost:1000
  - hostname: wa.knfcs.com
    service: http://localhost:1000
  - service: http_status:404
```

### Allowed Hosts

Production Django settings automatically allow all production hostnames:

```
knfcs.com, www.knfcs.com, api.knfcs.com, wa.knfcs.com, localhost, 127.0.0.1
```

### Frontend Environment Variables (`.env.production`)

```env
REACT_APP_API_URL=https://api.knfcs.com/api/v1
REACT_APP_WS_HOST=api.knfcs.com
GENERATE_SOURCEMAP=false
```

### Verifying the Setup

```powershell
$env:DJANGO_SETTINGS_MODULE = "config.settings.production"
python -c "import django; django.setup(); from django.conf import settings; print(settings.ALLOWED_HOSTS)"
```

Expected output:
```
['knfcs.com', 'www.knfcs.com', 'api.knfcs.com', 'wa.knfcs.com', 'localhost', '127.0.0.1']
```

---

## 9. Cloud Deployment (Render.com)

The production system runs entirely on cloud services — no local machine or Cloudflare Tunnel required for live customers.

### Architecture

| Service | Platform | URL |
|---------|----------|-----|
| **React Frontend** | Vercel | https://knfcs.com |
| **Django Backend API** | Render.com (`knfc-backend`) | https://knfc-backend.onrender.com |
| **WhatsApp Baileys Service** | Render.com (`knfc-whatsapp`) | https://knfc-whatsapp.onrender.com |
| **Database** | Supabase PostgreSQL | External — no Render DB cost |
| **Redis / Cache** | Upstash Redis | External — free tier |
| **Media Storage** | Supabase S3 (`knfc-media` bucket) | WhatsApp sessions also stored here |

### Deploying a New Version

Both Render services and Vercel deploy automatically when a commit is pushed to the `main` branch on GitHub.

```
git checkout main
git merge EDX-KNFC-v2.0
git push origin main
```

- **Vercel** rebuilds the React frontend (~60–90 seconds).
- **Render `knfc-backend`** rebuilds and restarts Django (~2–3 minutes). Runs `./build.sh` then starts Hypercorn ASGI.
- **Render `knfc-whatsapp`** rebuilds and restarts the Node.js WhatsApp service (~90 seconds). Session is restored from Supabase S3 automatically on boot.

### Environment Variables (Render Dashboard)

All secrets are set in the Render Dashboard under each service's **Environment** tab. The `render.yaml` file in the repo defines which values are auto-generated and which must be set manually (`sync: false`).

**Variables that must be set manually (not in `render.yaml`):**

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `knfc-backend` | Supabase PostgreSQL connection string |
| `REDIS_URL` | `knfc-backend` | Upstash Redis URL |
| `WHATSAPP_INTERNAL_KEY` | `knfc-backend` | Shared secret — must match `INTERNAL_KEY` in `knfc-whatsapp` |
| `INTERNAL_KEY` | `knfc-whatsapp` | Shared secret — must match `WHATSAPP_INTERNAL_KEY` in `knfc-backend` |
| `SUPABASE_S3_URL` | Both | `https://<ref>.supabase.co/storage/v1/s3` |
| `SUPABASE_S3_ACCESS_KEY` | Both | Supabase Dashboard → Storage → S3 Access Keys |
| `SUPABASE_S3_SECRET_KEY` | Both | Supabase S3 secret |
| `EMAIL_HOST_USER` | `knfc-backend` | Gmail address for staff OTP emails |
| `EMAIL_HOST_PASSWORD` | `knfc-backend` | Gmail App Password (not account password) |
| `DEFAULT_FROM_EMAIL` | `knfc-backend` | e.g., `KNFC <knfchead01@gmail.com>` |

### Running Migrations on Render

Render runs `./build.sh` before each deploy. Ensure `build.sh` includes:

```bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

To run a one-off migration or management command manually, use Render's **Shell** tab on the `knfc-backend` service.

### Free-Tier Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Services spin down after 15 min idle | First request takes ~30 s to wake up | WhatsApp service has self-ping every 13 min; OTP sender retries once on 503 |
| 750 free instance-hours/month per account | Both services share the allowance | Monitor usage in Render Dashboard |
| WhatsApp session lost on container restart | Customers cannot receive OTP | Session is saved to Supabase S3 and restored on boot automatically |

### Supabase Row-Level Security (RLS)

Supabase enables RLS by default on new projects. The Django backend connects as the `postgres` role. Two SQL scripts must be run once in the Supabase Dashboard → SQL Editor:

**1. Grant postgres full access (required — run once after enabling RLS):**
```sql
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS django_full_access ON public.%I AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true)',
      r.tablename
    );
  END LOOP;
END $$;
```

**2. Disable RLS on all tables (alternative — simpler for single-tenant):**
```sql
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
```

> If home page sections (Hot Deals, Chicken Items, etc.) appear empty after enabling RLS, run one of the above scripts.

### Vercel Frontend Deployment

The React frontend is deployed via Vercel, connected to the GitHub repo. Vercel auto-deploys on every push to `main`.

**Environment variables in Vercel Dashboard:**

```
VITE_API_URL=https://knfc-backend.onrender.com/api/v1
VITE_WS_HOST=knfc-backend.onrender.com
```

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **Token Number** | A daily sequential number (e.g., #45) assigned to each order. Resets at midnight. |
| **KOT** | Kitchen Order Ticket — a printed slip sent to the kitchen with order details. |
| **Carried-Over Order** | An order placed on a previous day still in the queue. Shown with a red warning badge. |
| **Carryover (Stock)** | Remaining stock at end of day that rolls into the next day's opening stock. Can be disabled per item. |
| **Walk-In Order** | An order placed by staff on behalf of a customer without an app account. |
| **Opening Stock** | The total stock count set at the start of each day before service begins. |
| **Top-Up** | An additional stock quantity added mid-day to supplement opening stock. |
| **Stock Lock** | A Branch Admin action that freezes the stock record for the day. Only Super Admin can unlock. |
| **Loyalty Points** | Points earned by registered customers on every paid order. Redeemable for discounts. |
| **Welcome Bonus** | A one-time flat ₹ discount for first-time customers, using the `welcome_bonus_amount` field. Only claimable once per account. |
| **BOGO** | Buy One Get One — purchasing one item gives another identical item free. |
| **Combo Offer** | A bundled deal on a specific group of items purchased together. |
| **UPI** | Unified Payments Interface — a real-time digital payment method popular in India (GPay, PhonePe, etc.). |
| **Awaiting Payment Page** | A secure post-order page shown after placing a UPI order. Displays a 5-minute countdown, GPay/PhonePe buttons, and a QR code. Automatically redirects to confirmation when staff marks payment received. |
| **Mark Paid** | The staff action on the order queue card confirming a UPI payment has been received. Required before the Confirm button appears. |
| **5-Minute Auto-Cancel** | Automatic cancellation of UPI orders if payment is not confirmed by staff within 5 minutes of placing the order. |
| **Spin Wheel** | A full-screen lucky-draw game on the Offers page. Segments have gradient colours, a gold outer ring, and a glowing pointer. Winning triggers a confetti burst. |
| **Scratch Card** | A full-screen gold-foil scratch game on the Offers page. Scratching reveals a coupon code with spark particles and a confetti explosion on full reveal. |
| **Coupon Code** | An alphanumeric code customers enter in the cart to redeem a specific offer discount. |
| **All Branches** | A toggle on menu items, categories, and offers making them visible at every branch. |
| **Item Discount** | A per-item percentage discount set on the menu item itself. Already reflected in the item's selling price. The cart shows the original Subtotal and deducts Item discounts separately so the maths is visible. |
| **Payment Serial** | A staff-assigned reference code for a payment (e.g., PAY001), auto-generated server-side when payment is marked. |
| **Invoice Page** | A clean, print-ready order receipt at `/order/invoice/:id`. No navigation footer is shown on this page. |
| **Baileys** | The open-source Node.js library used to connect WhatsApp accounts for OTP delivery and broadcasts. |
| **Celery** | The background task queue used for scheduled jobs (stock carryover, UPI auto-cancel, broadcasts, idle staff alerts). |
| **SiteConfig** | A single global settings record controlling loyalty, spin wheel, scratch card, login branding, ads, and more. Editable only by Super Admin. |
| **Session** | A staff login period — tracked from login to logout with location, duration, and idle detection. |
| **QR Code** | A scannable code generated per branch for in-store ordering and UPI payments. Only generated on demand (when the customer opens the QR toggle) — not shown at all times. |
| **Broadcast** | A bulk WhatsApp message sent to all (or branch-specific) registered customers. |
| **Cloudflare Tunnel** | A secure tunnel that exposes local services to the internet without opening firewall ports. Used for knfcs.com, api.knfcs.com, and wa.knfcs.com. |
| **Daphne** | The ASGI server used to run Django with WebSocket support. Started on port 1000. |
| **Cancellation Reason** | A predefined code (e.g., `out_of_stock`, `payment_timeout`) recorded when an order is cancelled. Shown to the customer on the Awaiting Payment page and Order History. |

---

*KNFC Fried Chicken — Internal Documentation v2.1 | June 2026*
*Developed by Edartx — For technical support, contact the system administrator.*

---

### Changelog

| Version | Date | Changes |
|---------|------|---------|
| **2.1** | June 2026 | Added Render.com cloud deployment section (§9); Blinkit-style unit chip on product images (§2.3); WhatsApp keep-alive and OTP retry mechanics (§6); updated Table of Contents |
| **2.0** | June 2026 | Initial release — full customer, staff, branch admin, super admin, WhatsApp, and site config documentation |
