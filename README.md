# AgroHelper Hub

Create a production-ready mobile-first web application called "AgroOrders" in Greek.

This application will be used by farmers who receive orders from customers and deliver products.

IMPORTANT:
This is the first working MVP.

Do NOT attempt to implement actual cellular phone-call recording yet.

First build the complete order management, customer management, product management, AI order extraction from text, maps and delivery workflow.

The application must work extremely well on mobile phones and look like a professional mobile application.

========================================
AUTHENTICATION

Create farmer authentication.

Registration:

Όνομα

Επώνυμο

Επιχείρηση

Τηλέφωνο

Email

Password

Login:

Email

Password

Forgot password.

Every farmer must only see their own products, customers, orders and deliveries.

Use the platform's real database and authentication.

========================================
PRODUCTS

Create a Products section.

Farmers can:

Add product

Edit product

Delete product

Change price

Enable/disable product

Fields:

Name

Category

Price

Unit

Available

Example:

Μαύρη κότα — 15 €
Πουλί — 10 €
Κόκορας — 20 €
Καρτέλα αυγά — 5 €

IMPORTANT:
When an order is created, save the current product price inside the order item so historical orders do not change when the product price changes.

========================================
CUSTOMERS

Create a Customers section.

Fields:

Ονοματεπώνυμο

Τηλέφωνο

Διεύθυνση

Latitude

Longitude

Σημειώσεις

If a customer with the same phone already exists for the same farmer, detect the existing customer and avoid duplicates.

Customer page:

Customer information

Phone

Address

Map location

Order history

Total orders

Total order value

Buttons:

"Κλήση"
"Πλοήγηση"
"Νέα παραγγελία"

========================================
ORDERS

Create a complete order system.

An order contains:

Customer

Products

Quantities

Unit prices

Total

Address

Phone

Date

Notes

Status

Statuses:

Νέα
Σε προετοιμασία
Έτοιμη
Σε διανομή
Παραδόθηκε
Ακυρώθηκε

The total must be calculated automatically.

Order details must show all information clearly.

========================================
AI ORDER CREATION

Create an AI-assisted order creation page.

For the first MVP, the farmer can paste or enter a conversation transcript into a text field.

Example:

"Γεια σας, θέλω 5 μαύρες κότες, 5 πουλιά, δύο κόκορες και μία καρτέλα αυγά. Μένω Λάμπρου Τζαβέλλα 31 και το τηλέφωνό μου είναι 6948080080."

The AI must extract:

Phone:
6948080080

Address:
Λάμπρου Τζαβέλλα 31

Products:
5 × Μαύρη κότα
5 × Πουλί
2 × Κόκορας
1 × Καρτέλα αυγά

The AI must match the spoken products with the farmer's product catalog.

The AI must never invent products or quantities.

If information is uncertain, mark it as uncertain.

Return structured data:

{
"customer_name": null,
"phone": "6948080080",
"address": "Λάμπρου Τζαβέλλα 31",
"products": [
{
"product_name": "Μαύρη κότα",
"quantity": 5
},
{
"product_name": "Πουλί",
"quantity": 5
},
{
"product_name": "Κόκορας",
"quantity": 2
},
{
"product_name": "Καρτέλα αυγά",
"quantity": 1
}
]
}

========================================
AI CONFIRMATION

Never create the final order automatically without confirmation.

After AI extraction show:

"Βρέθηκε η παρακάτω παραγγελία"

Customer:
Phone:
Address:

Products:
5 × Μαύρη κότα
5 × Πουλί
2 × Κόκορας
1 × Καρτέλα αυγά

Total:
XX €

Buttons:

[ΕΠΙΒΕΒΑΙΩΣΗ]
[ΔΙΟΡΘΩΣΗ]

Only after confirmation create the real database order.

========================================
MAP

Create a Map page.

Use Google Maps or another appropriate mapping service.

Display customer locations and pending delivery locations.

When clicking a customer marker show:

Name

Phone

Address

Order

Total

Status

Buttons:

"Κλήση"
"Πλοήγηση"
"Παραγγελία"

The "Πλοήγηση" button should open Google Maps or Apple Maps with the customer's destination.

========================================
DELIVERIES

Create a "Διανομές" page.

Show pending deliveries.

Each card:

Customer
Phone
Address
Products
Total
Status

Buttons:

"Πλοήγηση"
"Κλήση"
"Παραδόθηκε"

When the farmer presses "Παραδόθηκε":

Change delivery status

Change order status to "Παραδόθηκε"

Save delivery date and time

========================================
ROUTE PLANNING

Create a basic delivery route feature.

The farmer can select multiple pending deliveries.

Display all selected destinations on a map.

Show them in an ordered list.

Prepare the architecture so a routing API can later calculate the optimal route based on distance and travel time.

Do not pretend that live traffic or advanced route optimization works unless the required API is actually connected.

========================================
DASHBOARD

Create a Greek dashboard.

Show:

Παραγγελίες σήμερα
Νέες παραγγελίες
Διανομές σήμερα
Εκκρεμείς διανομές
Συνολική αξία σήμερα

Use large cards and simple icons.

========================================
SEARCH

Create search for:

Customers:

Name

Phone

Address

Orders:

Customer

Product

Order number

Date

========================================
ORDER HISTORY

Create order history.

Filters:

Date

Customer

Status

Product

Show:

Total orders
Total sales
Delivered orders
Cancelled orders

========================================
UI

The entire interface must be in Greek.

Use a mobile-first design.

Large buttons.
Large text.
Simple icons.
High readability.
Minimal complexity.

Bottom navigation:

Αρχική
Παραγγελίες
Χάρτης
Διανομές
Πελάτες

The UI should feel like a professional business application.

========================================
DATABASE SECURITY

Every farmer must only access his own:

Products

Customers

Orders

Deliveries

AI transcriptions

Implement proper authorization and database security.

Do not expose sensitive API keys in frontend code.

========================================
SCALABILITY

Initially approximately 15 farmers will use the application.

However, design the database so the application can later support hundreds or thousands of farmers.

Do not hard-code test users.

Use farmer_id/user_id relationships throughout the database.

========================================
AI API

Use the appropriate OpenAI API integration for AI order extraction.

Do not expose the OpenAI API key in frontend code.

Store secrets securely using backend/server-side mechanisms.

If an API key is required, tell me exactly where I need to configure it.

========================================
FUTURE TELEPHONE AI

Prepare the architecture for a future feature:

Customer calls farmer
↓
Telephone/VoIP system
↓
Audio
↓
Speech-to-text
↓
AI
↓
Structured order
↓
Farmer confirmation
↓
Database

IMPORTANT:

Do not claim that the application can automatically record ordinary cellular calls on iOS/Android.

This feature will be implemented later using an appropriate telephony/VoIP architecture and must respect applicable privacy and consent requirements.

========================================
IMPORTANT DEVELOPMENT RULE

Build the application incrementally.

First make:

Authentication

Database

Products

Customers

Orders

Dashboard

Map

Deliveries

AI text-to-order

fully functional.

Then test the entire workflow.

Do not create fake buttons that do nothing.

Do not create fake database records as the final implementation.

If an external service is required, tell me exactly what service and what configuration is needed.

Start building the application now.
::writing 62917:::

Αυτό το prompt είναι για το Lovable που έχεις μπροστά σου, όχι για FlutterFlow.

Και κάτι πολύ σημαντικό: αν ο στόχος σου είναι να έχουν οι 15 αγρότες κάτι χρησιμοποιήσιμο σε 7 ημέρες, εγώ θα έφτιαχνα πρώτα αυτό το MVP ως web app/PWA. Μετά μπορούμε να το πακετάρουμε για Google Play + App Store και να προσθέσουμε την τηλεφωνική AI λειτουργία.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://agroorders.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8385c0fa-fa31-50e5-8b43-9f82ac8f2333).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
