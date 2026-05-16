# How to Use KNFC Fried Chicken — Complete Guide
### For Customers, Staff, Admin & Super Admin

---

> **Version:** 1.0 | **Website:** knfcs.com | **API:** api.knfcs.com
> **Last Updated:** May 2026

---

## Table of Contents

1. [Introduction & Welcome](#introduction--welcome)
2. [Role Comparison Table](#role-comparison-table)
3. [Website Site Map](#website-site-map)
4. [Section 1 — Customers](#section-1--customers)
5. [Section 2 — Staff](#section-2--staff)
6. [Section 3 — Admin (Branch Manager)](#section-3--admin-branch-manager)
7. [Section 4 — Super Admin (Owner)](#section-4--super-admin-owner)
8. [Glossary of Terms](#glossary-of-terms)
9. [Troubleshooting & FAQs](#troubleshooting--faqs)
10. [Contact Support](#contact-support)

---

## Introduction & Welcome

Welcome to **KNFC Fried Chicken** — your complete restaurant ordering and management platform.

This guide explains how to use every part of the system, no matter your role. Whether you are a customer placing your first order, a staff member managing the kitchen queue, a branch manager running your outlet, or the owner overseeing all locations — this manual has step-by-step instructions written in simple language.

**What does the KNFC system do?**

- Customers can browse the menu, order food online, track their order live, collect loyalty points, and redeem special offers.
- Staff can view incoming orders, update statuses, print KOT (Kitchen Order Tickets), and manage the kitchen queue.
- Branch Admins manage the menu, offers, staff accounts, stock levels, and view sales reports.
- Super Admin controls all branches, WhatsApp notifications, global site settings, and the entire system.

**How to read this guide:**

Each section is written for one specific role. Jump directly to your section using the Table of Contents above. Screenshots are described in **[Screenshot: description]** boxes — insert actual screenshots in those positions when converting to PDF or Word.

---

## Role Comparison Table

| Feature / Action                     | Customer | Staff | Admin | Super Admin |
|--------------------------------------|:--------:|:-----:|:-----:|:-----------:|
| Browse menu (public)                 | Yes      | Yes   | Yes   | Yes         |
| Place an order online                | Yes      | Yes*  | No    | No          |
| Track order status                   | Yes      | Yes   | Yes   | Yes         |
| View loyalty points                  | Yes      | No    | No    | No          |
| Redeem scratch card                  | Yes      | No    | No    | No          |
| Leave a product review               | Yes      | No    | No    | No          |
| View kitchen queue                   | No       | Yes   | Yes   | Yes         |
| Update order status (KOT)            | No       | Yes   | Yes   | Yes         |
| Print / download bill                | No       | Yes   | Yes   | Yes         |
| Place order on behalf of customer    | No       | Yes   | Yes   | No          |
| Manage menu items & categories       | No       | No    | Yes   | Yes         |
| Create / edit offers & coupons       | No       | No    | Yes   | Yes         |
| Send WhatsApp broadcasts             | No       | No    | Yes** | Yes         |
| Manage staff accounts                | No       | No    | Yes   | Yes         |
| View sales analytics & reports       | No       | No    | Yes   | Yes         |
| Manage stock levels                  | No       | Yes   | Yes   | Yes         |
| View payment logs                    | No       | No    | Yes   | Yes         |
| Manage all branches                  | No       | No    | No    | Yes         |
| Configure site settings              | No       | No    | No    | Yes         |
| Manage WhatsApp sessions (QR scan)   | No       | No    | No    | Yes         |
| Create branch admin accounts         | No       | No    | No    | Yes         |

> \* Staff can place orders on behalf of walk-in customers via the POS screen.
> \*\* Branch Admins can only send offer-based broadcasts to their own branch.

---

## Website Site Map

Below is a complete map of all pages and who can access them.

```
knfcs.com/
│
├── PUBLIC PAGES (anyone can view)
│   ├── /                    → Home page (menu highlights, offers carousel, Google review)
│   ├── /menu                → Full menu browser
│   ├── /menu/:category      → Items in a specific category
│   ├── /item/:slug          → Product detail page (reviews, customisations)
│   ├── /search              → Search across all menu items
│   ├── /offers              → All active offers
│   ├── /offers/:id          → Single offer detail
│   └── /terms, /privacy, /about → Legal & info pages
│
├── CUSTOMER PAGES (requires customer login)
│   ├── /login/customer      → OTP phone login
│   ├── /register            → New customer registration (OTP verified)
│   ├── /cart                → Shopping cart
│   ├── /orders              → My orders history
│   ├── /orders/:id          → Live order tracking
│   ├── /account             → Profile, loyalty points, scratch card
│   └── /spin                → Spin wheel (if enabled by admin)
│
├── STAFF PAGES (requires staff login)
│   ├── /login/staff         → Staff login (user ID + password)
│   └── /staff/queue         → Kitchen order queue + KOT + Bill
│
├── ADMIN PAGES (requires branch admin login)
│   ├── /login/admin         → Admin email login
│   ├── /admin/dashboard     → Branch dashboard
│   ├── /admin/orders        → All branch orders
│   ├── /admin/menu          → Menu management (items + categories)
│   ├── /admin/offers        → Offers & coupons
│   ├── /admin/staff         → Staff accounts
│   ├── /admin/stock         → Stock levels
│   ├── /admin/analytics     → Sales reports & charts
│   └── /admin/broadcast     → WhatsApp broadcast (offer-based)
│
└── SUPER ADMIN PAGES (requires super admin login)
    ├── /login/admin         → Same login page, auto-routes to superadmin
    ├── /superadmin/dashboard → All-branches overview
    ├── /superadmin/branches  → Manage branches
    ├── /superadmin/menu      → Global menu management
    ├── /superadmin/offers    → All offers across branches
    ├── /superadmin/staff     → All staff accounts
    ├── /superadmin/stock     → Cross-branch stock
    ├── /superadmin/analytics → Network-wide analytics
    ├── /superadmin/broadcast → Full broadcast centre
    ├── /superadmin/whatsapp  → WhatsApp session management (QR scan)
    ├── /superadmin/payments  → Payment logs
    └── /superadmin/settings  → Site config, loyalty, scratch card, spin wheel
```

**Visual note:** Imagine this as a tree — the root is the homepage. Public branches are open to everyone. The deeper branches (customer, staff, admin, super admin) require a login and access is blocked if your role does not match.

---

# Section 1 — Customers

## Who is a Customer?

A customer is anyone who visits the website to browse the menu and place orders. Customers can be:
- Dine-in guests who order from their table.
- Pickup customers who order in advance and collect their food.
- Walk-in customers assisted by staff at the counter.

Customers earn **loyalty points** with every order, can redeem **offers and coupons**, scratch **reward cards**, and leave **reviews** on menu items.

---

## 1.1 Creating an Account

You need an account to place orders, track status, and earn loyalty points.

**Steps to register:**

1. Go to **knfcs.com**
2. Tap **Sign In / Register** at the top-right corner.
3. On the login screen, tap **"New here? Register"**
4. Enter your **mobile phone number** (Indian format, e.g. 9876543210)
5. Tap **Send OTP**
6. You will receive a **6-digit OTP** via WhatsApp or SMS
7. Enter the OTP within **3 minutes**
8. Enter your **name** to complete registration
9. You are now logged in and ready to order

> **Tip:** Your phone number is your permanent login — you will never need a username or password. Just your phone and the OTP.

**[Screenshot: Registration screen showing phone number input and OTP fields]**

---

## 1.2 Logging In

If you already have an account:

1. Go to **knfcs.com** → tap **Sign In**
2. Enter your **phone number**
3. Tap **Send OTP**
4. Enter the 6-digit OTP received via WhatsApp
5. Tap **Verify** — you're in

> **Tip:** Your session stays active. You won't need to log in every visit unless you manually log out.

---

## 1.3 Browsing the Menu

The homepage shows:
- **Offers carousel** — swipe through today's special deals (tap any card to see details)
- **Featured items** — chef-picked highlights
- **Category sections** — Chicken Items, Hot Deals, Snacks & Munchies, Cold Drinks
- **Google Review banner** — tap to leave a review on Google Maps

To explore the full menu:

1. Tap **Menu** in the navigation bar at the bottom
2. You will see **category cards** (e.g. Chicken Blast, Combo Deals, Drinks)
3. Tap a category to see all items in it
4. Each item card shows:
   - Photo or emoji image
   - Name and price
   - **Green dot** = Vegetarian | **Red dot** = Non-Vegetarian
   - Star rating from other customers
   - Spice level badge
   - "Bestseller" or "New" badge if applicable

**[Screenshot: Menu page with category cards and item tiles]**

---

## 1.4 Viewing a Product

Tap any menu item to see its detail page:

- Full-size photo
- Description and ingredients
- Spice level and calories (if shown)
- Preparation time estimate (e.g. "8–15 min")
- **Customisations** — choose options like "Extra Spicy", "Extra Sauce", or "No Salt"
- **Customer reviews** with star ratings and photos
- Price and **Add to Cart** button

**To add an item:**
1. Choose your customisation options (if any)
2. Adjust quantity using the **–** and **+** buttons
3. Tap **Add to Cart**

---

## 1.5 Using the Cart

To view your cart:
1. Tap the **cart icon** (bottom right) or the **Cart** tab
2. Review your items — you can increase, decrease, or remove any item
3. Enter a **Coupon Code** if you have one (tap "Have a coupon?")
4. Check the **subtotal**, any **discount**, and the **final total**

**[Screenshot: Cart page with item list, coupon field, and total breakdown]**

---

## 1.6 Placing an Order

1. From the cart, tap **Proceed to Checkout**
2. Choose your **Order Type:**
   - **Dine In** — select your table number from the list
   - **Pickup** — you will collect your order at the counter
3. Choose your **Payment Method:**
   - Cash
   - UPI (you will enter the UPI reference after paying)
   - Card
4. Add any **Special Instructions** (optional — e.g. "No onions please")
5. Tap **Place Order**
6. Your order is confirmed with a **Token Number** (e.g. **T007**)
7. You will be taken to the live order tracking screen

> **Tip:** Save your token number. Staff will call out your token when your order is ready.

---

## 1.7 Tracking Your Order

The order tracking screen shows the live status of your order:

| Status         | What it means                                        |
|----------------|------------------------------------------------------|
| **Placed**     | Your order was received successfully                 |
| **Confirmed**  | Kitchen has accepted your order                      |
| **Preparing**  | Food is being cooked right now                       |
| **Ready**      | Your order is ready — collect from the counter       |
| **Completed**  | Order handed over, all done                          |
| **Cancelled**  | Order was cancelled (see cancellation reason)        |

The page refreshes automatically. You can also view all past orders from **My Account → My Orders**.

**[Screenshot: Order tracking page with status progress bar and token number]**

---

## 1.8 Loyalty Points

You earn **1 loyalty point for every ₹10 spent**.

To check your points:
1. Tap **Account** (bottom navigation)
2. Your **loyalty points balance** is shown at the top

Points are added automatically after each completed order.

> **Note:** Points cannot currently be redeemed directly — they track your lifetime spend and may unlock special tiers or rewards when the admin enables them.

---

## 1.9 Scratch Cards

After a qualifying order, you may receive a **scratch card** with a reward.

**How to scratch:**
1. Go to **Account** → scroll to the **Rewards** section
2. Tap your scratch card
3. The card will reveal a reward (discount code, free item code, or a message)
4. Use the reward code at checkout before it expires

**[Screenshot: Account page showing scratch card with "Tap to reveal" prompt]**

---

## 1.10 Viewing and Redeeming Offers

1. Tap **Offers** in the navigation bar
2. Browse active offers — each card shows the discount, validity, and a tagline
3. Tap an offer to see full details
4. If the offer has a **coupon code**, copy it and paste it in your cart at checkout
5. If the offer is auto-applied, it activates when your cart qualifies

---

## 1.11 Leaving a Review

After your order is completed, you can review the items you ordered:

1. Go to **My Orders** → tap a completed order
2. Tap **Leave a Review** next to any item
3. Select a **star rating** (1–5 stars)
4. Optionally write a comment and upload a photo
5. Tap **Submit Review**

To leave a **Google Review:**
1. Tap the **Google Review** banner on the home page or account page
2. You will be taken to our Google Maps page — tap any star to start your review

---

## 1.12 Managing Your Account

Go to **Account** to:
- Edit your **name**
- View your **order history**
- See your **loyalty points**
- Access **scratch cards**
- Read privacy policy and terms
- **Log out**

---

## 1.13 Customer Tips & Best Practices

- **Order early during peak hours** — the kitchen can get busy during lunch (12–2 PM) and dinner (7–9 PM). Placing your order in advance saves waiting time.
- **Check offers first** — the home page carousel always shows the best deal of the day.
- **Use the search bar** — type any item name to find it instantly.
- **Pickup orders are faster** — if you're in a hurry, choose pickup and collect as soon as your token is called **Ready**.
- **Save your phone number** — it's your only login credential.

---

# Section 2 — Staff

## Who is a Staff Member?

Staff are the team members working at a KNFC outlet. They manage the **Kitchen Order Queue** — accepting orders, moving them through preparation stages, and marking them complete. They can also place orders for walk-in customers at the counter.

Staff can only see and manage orders for **their own branch**.

---

## 2.1 Logging In

Staff have a unique **User ID Login** and a password set by their admin.

1. Go to **knfcs.com/login/staff** or tap **Staff Login** on the homepage footer
2. Enter your **Staff User ID** (e.g. KNFC-ST-001) — given to you by your manager
3. Enter your **Password**
4. Tap **Login**
5. You are taken to the **Kitchen Queue** screen

> **First login:** If your admin set a "must change password" flag, you will be asked to set a new password before continuing.

**[Screenshot: Staff login page with User ID and password fields]**

---

## 2.2 The Kitchen Queue

The queue screen is your main workspace. It shows **all active orders** for your branch in real time.

The screen auto-refreshes every 15–30 seconds. You can also tap **Refresh** manually.

**What you see on each order card:**
- **Token number** (e.g. T012) — large and bold
- Order type: **Dine In** (with table number) or **Pickup**
- Customer name (or "Walk-in Customer")
- List of items ordered with quantities
- Time the order was placed
- Current **status badge** (colour-coded)
- Action buttons

**[Screenshot: Kitchen queue with multiple order cards in different status stages]**

---

## 2.3 Order Statuses and Actions

You advance each order through these stages using the buttons on the card:

### Stage 1 — Placed (New Order)
A new order just came in. It appears with a blue "Placed" badge.

**Action:** Tap **Confirm** to accept the order into the kitchen.

### Stage 2 — Confirmed
Order is accepted. Kitchen knows about it.

**Action:** Tap **Start Preparing** when you begin cooking.

### Stage 3 — Preparing
Food is being cooked. Customer can see this on their tracking screen.

**Action:** Tap **Mark Ready** when the order is ready to serve/collect.

### Stage 4 — Ready
Order is ready. The customer's screen shows "Ready to collect!"

**Action:** Tap **Complete** after handing the food to the customer.

### Stage 5 — Completed
Order is done. It disappears from the main queue.

> **Cancelling an order:** Tap **Cancel** on any active order. You will be asked to select a reason (e.g. "Item unavailable", "Customer request") and optionally add a note.

---

## 2.4 Printing a KOT (Kitchen Order Ticket)

A KOT is a printed or on-screen slip showing all items in an order — used by the kitchen team.

**To print a KOT:**
1. Find the order card in the queue
2. Tap the **KOT** button
3. A print-ready slip opens in a new tab showing:
   - Token number and date/time
   - Order type (Dine In / Pickup) and table number
   - Complete item list with quantities and any customisations
   - Special instructions
4. Tap **Print** in your browser (or use keyboard shortcut Ctrl+P / Cmd+P)
5. Choose your kitchen printer or save as PDF

**[Screenshot: KOT printout with token number, item list, and timestamp]**

---

## 2.5 Generating a Customer Bill

The **Bill** button is available on every order (in all status stages). The bill includes item prices and is suitable for the customer as a receipt.

**To generate a bill:**
1. Tap the **Bill** button on any order card
2. A bill popup opens showing:
   - Branch name and logo
   - Token number, date and time
   - Order type (Dine In / Pickup)
   - Complete item list with **unit prices** and **subtotals**
   - Any discount applied
   - **Grand total**
   - Payment method
3. Two buttons appear at the bottom:
   - **Print / Save PDF** — tap to open your browser print dialog
   - **Close** — close the popup

> **Tip:** Use "Save as PDF" in the print dialog to keep a digital copy. Both staff and customers can download the bill this way.

**[Screenshot: Bill popup showing itemized receipt with total and print/download buttons]**

---

## 2.6 Placing an Order for a Walk-in Customer

If a customer orders at the counter (no phone, no app):

1. In the queue screen, tap **+ New Order** or **Place Order**
2. The POS screen opens
3. Tap items to add them to the order — use **+** and **–** to adjust quantities
4. Enter **customer name** and optionally a **phone number** (for their records)
5. Choose **Order Type** (Dine In or Pickup) and table number if dine-in
6. Choose **payment method** (Cash, UPI, or Card)
7. Apply any coupon or offer if applicable
8. Tap **Place Order**

The order enters the queue immediately, just like an online order.

---

## 2.7 Managing Stock (Morning Setup)

At the start of each day (or shift), set the opening stock for your items:

1. Go to **Stock** tab (if shown on your screen)
2. For each menu item, enter how many units you have today
3. Tap **Set Opening Stock**

As orders come in, stock is automatically deducted. If stock hits zero, the item is marked **Unavailable** on the customer menu.

You can do a **mid-day top-up** if you receive more stock during the day.

> **Note:** Not all branches show the Stock tab to staff — your admin may restrict this to admin-only.

---

## 2.8 Staff Tips & Best Practices

- **Confirm orders quickly.** Customers can see when you confirm — fast confirmation builds trust.
- **Always print the KOT** for dine-in orders so the kitchen team has a physical reference.
- **Mark Ready only when the food is actually ready.** The customer's screen shows "Ready to collect" — if they come too early, it causes confusion.
- **Check the queue when you arrive** — there may be carryover orders from just before your shift.
- **If the screen stops updating**, tap Refresh or reload the browser page. Your session is still active.

---

## 2.9 Staff Troubleshooting

| Problem | Solution |
|---------|---------|
| Cannot log in | Check your User ID (no spaces). Ask your admin to reset your password. |
| Orders not appearing | Tap Refresh. Check your internet connection. |
| KOT print is blank | Make sure the popup wasn't blocked. Allow popups for this site in your browser settings. |
| Bill button missing | It should appear on all orders — try refreshing the page. |
| Marked order wrong status | Contact your admin — they can see the order history and correct it. |

---

# Section 3 — Admin (Branch Manager)

## Who is a Branch Admin?

A Branch Admin (also called Admin or Manager) manages one KNFC outlet. They have full control over their branch's menu, offers, staff, stock, and can view detailed sales reports. They can also send WhatsApp broadcasts (offer-based) to their branch customers.

Branch Admins **cannot** access other branches or global system settings — that is the Super Admin's role.

---

## 3.1 Logging In

1. Go to **knfcs.com/login/admin**
2. Enter your **email address** (set by Super Admin)
3. Enter your **password**
4. Tap **Login**
5. You are taken to your **Branch Dashboard**

**[Screenshot: Admin login page with email and password fields]**

---

## 3.2 Branch Dashboard

The dashboard is your central control panel. It shows an at-a-glance summary of today's branch activity:

- **Today's Orders** — total count
- **Revenue Today** — total sales in ₹
- **Active Orders** — currently in queue
- **Low Stock Alerts** — items running low
- **Staff on Duty** — currently logged-in staff
- **Recent Orders** — latest 5–10 orders

Use the **sidebar** (left panel) to navigate between all admin sections.

**[Screenshot: Branch dashboard with metrics cards and sidebar navigation]**

---

## 3.3 Viewing and Managing Orders

1. In the sidebar, tap **Orders**
2. You see all orders for your branch with filters:
   - Status (All, Placed, Preparing, Ready, Completed, Cancelled)
   - Date range
   - Order type (Dine In / Pickup)
3. Tap any order to see its details
4. You can:
   - **Update status** (same as staff)
   - **Print KOT**
   - **Download Bill**
   - **Cancel** an order (with reason)
   - **Mark payment** as Paid/Waived

---

## 3.4 Managing the Menu

### 3.4.1 Categories

Go to **Menu → Categories**

**To add a new category:**
1. Tap **+ Add Category**
2. Enter the category **Name** (e.g. "Combo Deals")
3. Upload a **banner image** (optional — an emoji fallback is shown if no image)
4. Set **display order** (lower number = shown first)
5. Choose **gradient colours** for the category scene background
6. Toggle **Is Active** on
7. Toggle **All Branches** if this category should appear across the whole chain
8. Tap **Save**

**To edit a category:**
1. Find it in the list and tap **Edit**
2. Make your changes and tap **Save**

**To deactivate (hide without deleting):**
1. Find the category and toggle **Is Active** to off

### 3.4.2 Menu Items

Go to **Menu → Items**

**To add a new item:**
1. Tap **+ Add Item**
2. Fill in:
   - **Name** and **Description**
   - **Price** (in ₹)
   - **Category** (select from your active categories)
   - **Dietary type**: Veg / Non-Veg / Vegan
   - **Spice level**: Mild / Medium / Hot / Extra Hot
   - **Measurement unit** (e.g. pcs, g, ml, portion, box)
   - **Unit quantity** (e.g. 6 for "6 pcs", 500 for "500g")
   - **Prep time** range (min and max minutes)
   - **Discount** % (optional, e.g. 20 for 20% off)
3. Upload a **product photo** (highly recommended)
4. Toggle flags:
   - **Is Featured** — shown in featured section
   - **Is New** — shows a "New" badge
   - **Is Bestseller** — shows a flame badge
   - **Is Available** — controls if customers can order this item
   - **Home page sections**: Hot Deals / Chicken Items / Snacks / Cold Drinks
5. Set **low stock threshold** — alerts trigger when stock falls below this number
6. Tap **Save**

**[Screenshot: Add item form with all fields visible]**

**To edit an item:** tap **Edit** next to any item.

**To temporarily hide an item:** toggle **Is Available** to off. Customers will see "Unavailable" instead.

**To add customisation options to an item:**
1. Open the item for editing
2. Scroll to **Customisations**
3. Tap **+ Add Option**
4. Enter option name (e.g. "Extra Spicy") and extra price (0 if free)
5. Set display order and mark as default if needed
6. Save

---

## 3.5 Managing Offers & Coupons

Go to **Offers** in the sidebar.

### Creating an Offer

1. Tap **+ Create Offer**
2. Fill in:
   - **Name** (e.g. "Friday Feast — 30% Off")
   - **Tagline** (short catchy line shown on the offer card)
   - **Offer Type**: Percentage / Flat amount / Combo / BOGO / Free Item
   - **Discount**: either a percentage (e.g. 30) or a flat amount (e.g. ₹50)
   - **Original price** and **Offer price** (for display)
   - **Start date/time** and **End date/time** (leave end blank for a permanent offer)
   - **Coupon code** (optional — customers type this in their cart)
   - **Min order value** (optional — e.g. offer only applies on orders above ₹300)
   - **Max redemptions per customer** (0 = unlimited)
   - **First order only** toggle (for new-customer deals)
3. Upload an **image** (shown in the carousel) or a **video ad** (MP4, plays in hero)
4. Toggle **Auto Broadcast** — when turned on, a WhatsApp broadcast is automatically sent to all customers when this offer is activated
5. Set **carousel order** (lower number = shown first in the offers slider)
6. Toggle **Is Active**
7. Tap **Save**

**[Screenshot: Offer creation form]**

### Editing or Deactivating an Offer

1. Find the offer in the list
2. Tap **Edit** to change details
3. Toggle **Is Active** to off to hide it from customers without deleting

---

## 3.6 Sending a WhatsApp Broadcast

Go to **Broadcast** in the sidebar.

> **Important:** WhatsApp broadcasts require the WhatsApp broadcast session to be connected (scanned by Super Admin). If the session is offline, a **warning banner** will appear at the top of the page. Ask your Super Admin to re-scan the QR code.

**To send an offer broadcast:**

1. Select **Offer Broadcast** mode
2. Choose an offer from the dropdown — the message caption is auto-generated
3. Add an optional **intro message** (e.g. "Good evening! Today's special for you:")
4. Choose **Target**: All Customers or Branch Only
5. Toggle **Auto Broadcast** on the offer if you want future activations to send automatically
6. Tap **Send Broadcast**
7. Confirm the popup warning
8. The broadcast appears in the history below with live progress (sent/total/failed)

**[Screenshot: Broadcast page with offer selection and progress bar]**

---

## 3.7 Managing Staff

Go to **Staff** in the sidebar.

### Adding a New Staff Member

1. Tap **+ Add Staff**
2. Fill in:
   - **Full name**
   - **Email address** (used for account verification)
   - **User ID Login** (unique ID they use to log in, e.g. KNFC-ST-005)
   - **Password** (temporary — staff should change on first login)
   - **Shift start** and **Shift end** times (e.g. 09:00 to 18:00)
3. Tap **Create Staff**
4. The staff member receives a verification email
5. They must verify their email before they can log in

**[Screenshot: Create staff form]**

### Managing Existing Staff

From the staff list you can:
- **Edit** staff details (name, shift times)
- **Reset password** — generates a new temporary password
- **Deactivate** — staff cannot log in while deactivated
- **View session history** — see when they logged in, from where, and for how long

---

## 3.8 Stock Management

Go to **Stock** in the sidebar.

The stock page shows every menu item with:
- **Today's stock** (opened + added)
- **Used** (deducted by orders)
- **Remaining** (live count)
- **Status badge**: OK (green) / Low (yellow) / Critical (red) / Out of Stock (grey)

### Setting Opening Stock

Each morning before service starts:
1. For each item, enter the quantity available today
2. Tap **Set Opening Stock**

### Adding Stock Mid-Day (Top-Up)

If you receive more stock during the day:
1. Find the item
2. Enter the quantity to add
3. Tap **Top Up**

### Stock Logs

Tap **View Log** on any item to see a complete audit trail — who changed stock, when, and by how much.

> **Tip:** When an item hits zero, it is automatically marked as unavailable on the customer menu. Top it up to restore availability.

---

## 3.9 Analytics & Reports

Go to **Analytics** in the sidebar.

You can view:
- **Revenue over time** (daily, weekly, monthly chart)
- **Order count** trends
- **Top-selling items** — ranked by orders and revenue
- **Order type split** — Dine In vs Pickup ratio
- **Payment method breakdown** — Cash / UPI / Card
- **Staff performance** — orders handled per staff member
- **Average order value**

Filter by **date range** using the date picker at the top.

**[Screenshot: Analytics dashboard with revenue chart and top items list]**

---

## 3.10 Viewing Payment Logs

Go to **Payments** (if visible in your sidebar).

Each payment log entry shows:
- Order token number
- Amount paid
- Payment method (Cash/UPI/Card)
- UPI reference number (if UPI)
- Payment serial number
- Who marked the payment
- Date and time

You can filter by payment method and date range.

---

## 3.11 Admin Tips & Best Practices

- **Set up all menu items and categories before going live.** Test by browsing the menu as a customer (open a private browser window).
- **Create your opening stock every morning.** Without stock, items may show as unavailable unnecessarily.
- **Use auto-broadcast for special offers.** Toggle it on when you activate a new offer — it automatically sends to all customers.
- **Review the analytics weekly.** Spot low-selling items and consider offering a discount or removing them.
- **Deactivate staff accounts immediately** when someone leaves your team.
- **Use the coupon code feature** for promotions — it is trackable and can be limited per customer.

---

## 3.12 Admin Troubleshooting

| Problem | Solution |
|---------|---------|
| Staff cannot log in | Check if their account is Active and their email is verified |
| Offer not showing on customer menu | Check Is Active toggle and the Start Date (must be in the past) |
| Broadcast shows 0 delivered | WhatsApp broadcast session is disconnected — contact Super Admin |
| Item showing as Unavailable | Check stock level — top up if at zero |
| Stock not deducting automatically | Ensure the menu item has a Stock Record for today |
| Analytics showing wrong date range | Use the date picker to reset the range |

---

# Section 4 — Super Admin (Owner)

## Who is the Super Admin?

The Super Admin is the highest-level account — typically the owner or head of operations for the KNFC chain. They have **full access to everything** across all branches: all menus, all orders, all staff, all analytics, and critical system settings.

Only the Super Admin can:
- Create and manage branches
- Create Branch Admin accounts
- Configure the WhatsApp service (scan QR codes)
- Control site-wide settings (loyalty points, scratch cards, spin wheel)
- Send broadcasts to all customers across all branches

---

## 4.1 Logging In

1. Go to **knfcs.com/login/admin** (same login page as Branch Admin)
2. Enter your **email address** and **password**
3. Tap **Login**
4. You are automatically routed to the **Super Admin Dashboard**

---

## 4.2 Super Admin Dashboard

The Super Admin dashboard shows a **network-wide overview:**

- Total branches active
- Today's total revenue across all branches
- Total orders today (all branches)
- Active orders in queue (all branches)
- Staff on duty across the network
- Low stock alerts from any branch

The sidebar has all available sections. Click any section to navigate.

**[Screenshot: Super Admin dashboard with multi-branch metrics]**

---

## 4.3 Managing Branches

Go to **Branches** in the sidebar.

### Creating a New Branch

1. Tap **+ Add Branch**
2. Fill in:
   - **Branch name**
   - **Address** (full physical address)
   - **Phone** and **Email** for the branch
   - **Max tables** (maximum dine-in tables available)
   - **Order modes**: toggle Enable Pickup and/or Enable Dine-In
   - **Pickup UPI only** — if on, pickup orders must pay via UPI (no cash)
   - **Operating hours** (per day of week — set open/close times)
   - **Location** — latitude and longitude (for nearest-branch detection)
3. Upload a **QR code** image for table ordering (optional)
4. Toggle **Is Active**
5. Tap **Save**

### Editing Operating Hours

1. Find the branch and tap **Edit**
2. In the **Operating Hours** section, set open and close times for each day
3. You can mark a day as "Closed" entirely
4. Tap **Save**

Branch open/close status is shown live to customers on the home page.

---

## 4.4 Creating Branch Admin Accounts

1. Go to **Staff** in the sidebar
2. Tap **+ Add User**
3. Select **Role: Branch Admin**
4. Choose which **branch** they manage
5. Fill in name, email, and a temporary password
6. Tap **Create**
7. The new admin receives a verification email

> **Note:** Branch Admins are immediately verified on creation — no OTP needed.

---

## 4.5 Global Menu Management

As Super Admin, you can manage menu items and categories for **any branch:**

1. Go to **Menu** in the sidebar
2. Use the **Branch selector** dropdown at the top to choose which branch you're editing
3. All the same menu management tools are available (categories, items, customisations)

**All-branches items/categories:**
When you toggle **All Branches** on a menu item or category, it appears in the menus of **all branches** — useful for chain-wide standard items.

---

## 4.6 Cross-Branch Analytics

Go to **Analytics** in the sidebar.

You can view:
- **All branches combined** — total network performance
- **Per-branch breakdown** — compare branches side-by-side
- Revenue, order count, top items, payment methods for any date range

Use the **branch dropdown** to switch between network view and individual branch view.

---

## 4.7 Managing WhatsApp Sessions

Go to **WhatsApp** in the sidebar.

> This is one of the most important maintenance tasks for the Super Admin. WhatsApp must be connected for OTP logins and broadcasts to work.

The KNFC system uses **two separate WhatsApp sessions:**

| Session       | Purpose                                          |
|---------------|--------------------------------------------------|
| **OTP**       | Sends login verification codes to customers      |
| **Broadcast** | Sends offer promotions to all/branch customers   |

Each session requires its own **QR code scan** from a separate WhatsApp account.

**[Screenshot: WhatsApp page showing two session status cards with QR codes]**

### Checking Session Status

The page shows a live status for each session:
- **Connected** (green) — working normally
- **Connecting** — scanning in progress
- **Disconnected** — session dropped, needs re-scan
- **Service Down** — the WhatsApp Node service is not running (server issue)

### Scanning / Reconnecting a Session

1. Go to **WhatsApp** page
2. Find the session that is disconnected (OTP or Broadcast)
3. A QR code is displayed — it refreshes automatically every 60 seconds
4. Open **WhatsApp** on the phone assigned to that session
5. Tap the **three dots menu** (top right) → **Linked Devices** → **Link a Device**
6. Point the phone camera at the QR code on screen
7. Wait 5–10 seconds — the status will change to **Connected**
8. Repeat for the other session if needed

> **Critical:** Use two different WhatsApp accounts — one phone number for OTP, another for Broadcast. You cannot use the same number for both sessions.

### Logging Out a Session

1. Tap **Logout** on the session card
2. Confirm
3. The session is cleared — scan a new QR to reconnect

> **When to reconnect:** WhatsApp sessions can drop if the linked phone loses internet, the phone is restarted, or WhatsApp is updated. If customers report not receiving OTPs, or if broadcasts are failing, check this page first.

---

## 4.8 Sending Broadcasts (Full Control)

Go to **Broadcast** in the sidebar.

As Super Admin, you have two broadcast modes:

### Mode 1 — Offer Broadcast
Same as Branch Admin, but you can choose **Target: All Customers** (across all branches) or **Target: Branch** (specific branch only).

### Mode 2 — Custom Message

1. Select **Custom Message** mode
2. Enter a **Title** (internal label)
3. Write your **Message** (supports WhatsApp formatting: *bold*, _italic_, ~strikethrough~)
4. Upload an **image** (optional)
5. Choose **Target**: All Customers or a specific branch
6. Tap **Send Broadcast**

**Broadcast History:**
Below the compose area, all past broadcasts are listed. Each shows:
- Title and status (Pending / Running / Done / Failed)
- Progress bar: sent / total recipients
- Failed count (in red if any)

**If a broadcast is stuck:**
1. Tap the broadcast card to expand it
2. Tap **Force Run (No Celery)** to run it immediately via server thread
3. If it keeps failing, check the **WhatsApp page** — the broadcast session may be disconnected

---

## 4.9 Site Configuration (Settings)

Go to **Settings** in the sidebar.

> **Tip:** These settings affect the entire website — all customers and branches. Change with care.

### Loyalty Points

- **Enable Loyalty** — toggle on/off to enable or disable the loyalty points system
- Points are automatically earned at 1 point per ₹10 spent

### Scratch Cards

- **Enable Scratch Card** — toggle on/off
- **Scratch prize pool** — configure what rewards the cards can contain

### Spin Wheel

- **Enable Spin Wheel** — toggle on/off
- **Spin prizes** — configure the prizes and their weightings (JSON format)
- Customers can access the spin wheel from their account page (when enabled)

### Login Page

- **Login image** — upload a background image for the customer login screen
- **Login video URL** — link to a video that plays on the login screen
- **Login slides** — configure a slideshow for the login page

### Site Settings

- **Site URL** — the public URL (e.g. https://knfcs.com) — used in WhatsApp broadcast links
- **Google Place ID** — for the Google Review button

**[Screenshot: Settings page showing toggle switches for all features]**

---

## 4.10 Payment Logs

Go to **Payments** in the sidebar.

You can view all payment records across all branches:
- Filter by branch, payment method, date range
- See who marked each payment
- Export data for accounting (if export option is available)

---

## 4.11 Monitoring Staff Activity

Go to **Staff** in the sidebar → click any staff member → **Session History**

You can see:
- Each login and logout event
- Location at login time (latitude, longitude, approximate address)
- How long each session lasted
- Whether the session is currently active or idle

> **Idle:** A session is marked Idle after 60 minutes of no activity. It does not automatically log the staff out — they can resume working.

---

## 4.12 Super Admin Tips & Best Practices

- **Scan WhatsApp QR codes as soon as sessions disconnect.** OTP failures prevent customers from logging in entirely.
- **Use two dedicated phones for WhatsApp sessions** — do not use personal phones that might be switched off or updated frequently.
- **Review all-branch analytics weekly** to identify which branches need attention.
- **Keep the Site URL setting up to date.** If the domain changes, offer broadcast links will break.
- **Set operating hours for every branch.** Without them, the open/closed status on the customer app will be inaccurate.
- **Test a new offer as a customer** before sending a broadcast — open a private window and verify the offer looks correct.
- **Enable Auto Broadcast on seasonal offers** — they send automatically when the offer is activated, without needing to manually queue a broadcast every time.

---

## 4.13 Super Admin Troubleshooting

| Problem | Solution |
|---------|---------|
| Customers not receiving OTP | Check OTP WhatsApp session status on the WhatsApp page — reconnect if disconnected |
| Broadcasts failing (0 delivered) | Check Broadcast WhatsApp session — scan QR to reconnect |
| Broadcast stuck in "Pending" | Use "Force Run (No Celery)" button on the broadcast card |
| Branch not visible on customer map | Check if the branch has latitude/longitude set and Is Active is on |
| Staff cannot log in across any branch | Check if they are Active and email is verified |
| Offers not showing on home page | Check if Is Active is on and Start Date is in the past |
| WhatsApp service shows "Service Down" | The Node.js WhatsApp service on the server is not running — restart it: `cd whatsapp-service && node index.js` |
| Spin wheel or scratch card not appearing | Check the Settings page — toggle must be on |

---

# Glossary of Terms

| Term | Meaning |
|------|---------|
| **Token Number** | A daily sequential order number (e.g. T007). Resets to T001 at midnight each day. |
| **KOT** | Kitchen Order Ticket — a printout for the kitchen showing what to prepare. |
| **OTP** | One-Time Password — a 6-digit code sent via WhatsApp used to verify your phone number at login. |
| **Branch** | One physical KNFC outlet location. |
| **Dine In** | Ordering food to eat at a table inside the restaurant. |
| **Pickup** | Ordering in advance and collecting at the counter. |
| **Walk-in** | A customer who orders at the counter without using the app. |
| **Loyalty Points** | Reward points earned with every order (1 point per ₹10 spent). |
| **Scratch Card** | A digital reward card revealed by tapping — may contain discount codes or prizes. |
| **Spin Wheel** | A reward game where customers spin a wheel for a chance to win prizes (if enabled). |
| **Broadcast** | A WhatsApp message sent to all customers (or a specific branch's customers) about an offer or announcement. |
| **Auto Broadcast** | When an offer's "Auto Broadcast" toggle is on, a WhatsApp message is sent automatically when the offer is activated. |
| **Coupon Code** | A short code customers enter at checkout to apply a discount (e.g. "SAVE20"). |
| **Carryover** | Stock that was not used yesterday and rolls over to today automatically at midnight. |
| **Celery** | The background task system that handles scheduled jobs (nightly stock carryover, broadcast batching). |
| **Baileys** | The WhatsApp connection library used to send OTP and broadcast messages. |
| **Session (WhatsApp)** | A WhatsApp connection. Two are used: one for OTP, one for broadcasting. |
| **QR Code** | A square scannable code — used both for table ordering and for connecting WhatsApp sessions. |
| **JWT** | The secure login token stored in your browser after logging in — your system "passport". |
| **Stock Alert** | A system notification when an item's remaining stock falls below the threshold set by the admin. |

---

# Troubleshooting & FAQs

## General

**Q: The website is very slow or not loading.**
A: Check your internet connection first. If the website is down, contact Super Admin — it could be a server issue.

**Q: I see a "Service Unavailable" error.**
A: The server might be restarting. Wait 1–2 minutes and refresh. If it persists, contact your technical team.

---

## Customers

**Q: I didn't receive my OTP.**
A: Wait 30 seconds and try again. Check if WhatsApp is connected on your phone. If OTPs consistently fail, the system's WhatsApp OTP session may be disconnected — contact the restaurant.

**Q: My order is stuck on "Placed" for a long time.**
A: The kitchen may be busy. If it's been more than 15 minutes with no update, approach the counter or call the branch.

**Q: I applied a coupon but got no discount.**
A: Make sure your cart total meets the minimum order value for that offer. Some offers are for first-time orders only, or have a redemption limit.

**Q: I can't see an item I ordered before.**
A: It may be temporarily unavailable (out of stock) or removed from the menu. Check back later or ask staff.

---

## Staff

**Q: The queue is not showing new orders.**
A: Tap the Refresh button or reload the page. Make sure you're logged in to the correct branch.

**Q: I accidentally marked an order as Complete.**
A: Completed orders cannot be undone by staff. Contact your Admin or Super Admin to check the record.

---

## Admin / Super Admin

**Q: I activated an offer but no broadcast was sent.**
A: Check that "Auto Broadcast" is toggled on for that offer AND that the WhatsApp broadcast session is connected (check the WhatsApp page).

**Q: A staff member says they can't log in.**
A: Check: (1) Is their account Active? (2) Is their email verified? (3) Are they using the correct User ID (not email)? (4) Reset their password if needed.

**Q: Broadcasts show as "Done" but customers received nothing.**
A: The WhatsApp broadcast session was likely disconnected. All messages failed silently. Reconnect the session and use **Force Run** to resend the broadcast.

---

# Contact Support

For technical issues with the KNFC system, contact the development team:

| Type | Details |
|------|---------|
| **Email** | InfoxTrading21@gmail.com |
| **Website** | knfcs.com |
| **API Endpoint** | api.knfcs.com |

**When contacting support, please include:**
1. Your role (Customer / Staff / Admin / Super Admin)
2. Which branch you are at
3. What you were trying to do
4. The exact error message (screenshot if possible)
5. The date and approximate time of the issue

---

*This manual covers KNFC POS System v1.0. Features and screens may vary slightly as the system is updated.*

*For the latest version of this guide, ask your Super Admin.*

---

**End of KNFC User Manual**
