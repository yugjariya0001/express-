# Express Tadka API Documentation

Base URL: `http://localhost:5000`

## Authentication

All protected routes require a JWT token in an httpOnly cookie (`accessToken`) or via `Authorization: Bearer <token>` header.

---

## Auth Routes (`/api/auth`)

### POST `/api/auth/send-otp`
Send OTP to mobile number.

**Request:**
```json
{ "mobile": "9876543210" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otp": "123456",        // Only in development mode
  "note": "OTP shown in development mode only"
}
```

**Rate limit:** 3 requests per 10 minutes per IP

---

### POST `/api/auth/verify-otp`
Verify OTP and login/register user.

**Request:**
```json
{ "mobile": "9876543210", "otp": "123456" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "mobile": "9876543210",
      "role": "user",
      "name": null
    },
    "accessToken": "eyJhbGci..."
  }
}
```

Sets `accessToken` (15min) and `refreshToken` (7d) httpOnly cookies.

---

### POST `/api/auth/logout`
🔒 Authenticated. Clears tokens.

---

### GET `/api/auth/me`
🔒 Authenticated. Returns current user profile.

---

### POST `/api/auth/refresh`
Refresh access token using refresh token cookie.

---

### PATCH `/api/auth/profile`
🔒 Authenticated. Update name and email.

**Request:**
```json
{ "name": "Rajesh Kumar", "email": "rajesh@example.com" }
```

---

## Train Routes (`/api/trains`)

### GET `/api/trains/search?q=rajdhani`
Search trains by name or number.

**Response:**
```json
{
  "success": true,
  "data": {
    "trains": [
      {
        "_id": "...",
        "number": "12301",
        "name": "Rajdhani Express",
        "from": { "code": "NDLS", "name": "New Delhi", "city": "New Delhi" },
        "to": { "code": "HWH", "name": "Howrah Junction", "city": "Kolkata" },
        "schedule": [...]
      }
    ]
  }
}
```

---

### GET `/api/trains/:id`
Get train details with full schedule.

---

### POST `/api/trains/pnr`
Mock PNR lookup.

**Request:**
```json
{ "pnr": "1234567890" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pnr": "1234567890",
    "trainNumber": "12301",
    "trainName": "Rajdhani Express",
    "journeyDate": "2024-12-25",
    "from": "NDLS",
    "to": "HWH",
    "passengerName": "Rajesh Kumar",
    "seatClass": "3A",
    "schedule": [...],
    "trainId": "..."
  }
}
```

---

### GET `/api/trains`
List all trains.

### GET `/api/trains/stations/list`
List all stations.

---

## Restaurant Routes (`/api/restaurants`)

### GET `/api/restaurants?station=stationId&cuisine=North+Indian&page=1&limit=20`
List restaurants with optional filters.

**Response:**
```json
{
  "success": true,
  "data": { "restaurants": [...] },
  "total": 50,
  "page": 1,
  "pages": 3
}
```

---

### GET `/api/restaurants/:id`
Get restaurant details.

---

### GET `/api/restaurants/:id/menu?veg=true`
Get restaurant menu grouped by category.

**Response:**
```json
{
  "success": true,
  "data": {
    "menu": {
      "Main Course": [...],
      "Starters": [...]
    },
    "items": [...]
  }
}
```

---

### GET `/api/restaurants/:id/reviews`
Get restaurant reviews.

---

### POST `/api/restaurants`
🔒 Admin only. Create restaurant.

**Request:**
```json
{
  "name": "Spice Garden",
  "owner": "userId",
  "stations": ["stationId1"],
  "cuisine": ["South Indian"],
  "commissionRate": 12
}
```

---

### PUT `/api/restaurants/:id`
🔒 Owner or Admin. Update restaurant.

---

### POST `/api/restaurants/:id/food-items`
🔒 Owner or Admin. Add food item.

**Request:**
```json
{
  "name": "Butter Chicken",
  "description": "Creamy tomato chicken curry",
  "price": 220,
  "category": "Main Course",
  "isVeg": false
}
```

---

### PUT `/api/restaurants/:id/food-items/:itemId`
🔒 Owner or Admin. Update food item.

### DELETE `/api/restaurants/:id/food-items/:itemId`
🔒 Owner or Admin. Delete food item.

---

## Order Routes (`/api/orders`)

### POST `/api/orders/validate-coupon`
🔒 Authenticated. Validate coupon code.

**Request:**
```json
{ "code": "SAVE20", "cartTotal": 500 }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coupon": { "code": "SAVE20", "type": "percentage", "value": 20 },
    "discount": 100
  }
}
```

---

### POST `/api/orders`
🔒 Authenticated. Place an order.

**Request:**
```json
{
  "restaurantId": "...",
  "trainId": "...",
  "boardingStationId": "...",
  "deliveryStationId": "...",
  "journeyDate": "2024-12-25T00:00:00Z",
  "pnr": "1234567890",
  "items": [
    { "foodItemId": "...", "quantity": 2 }
  ],
  "couponCode": "FIRST50",
  "specialInstructions": "No onion",
  "paymentMethod": "razorpay"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "status": "placed",
      "totalAmount": 440,
      "discountAmount": 50,
      "finalAmount": 390,
      "payment": { "status": "pending" }
    }
  }
}
```

---

### GET `/api/orders?page=1&limit=10&status=placed`
🔒 Authenticated. Get my orders.

---

### GET `/api/orders/:id`
🔒 Authenticated. Get order details.

---

### PATCH `/api/orders/:id/status`
🔒 Restaurant or Admin. Update order status.

**Request:**
```json
{ "status": "confirmed", "note": "Accepted" }
```

Valid statuses: `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`

---

### GET `/api/orders/restaurant/:restaurantId`
🔒 Restaurant or Admin. Get orders for a restaurant.

---

### POST `/api/orders/:id/review`
🔒 Authenticated. Review a delivered order.

**Request:**
```json
{ "rating": 5, "comment": "Excellent food!" }
```

---

## Payment Routes (`/api/payments`)

### POST `/api/payments/create-order`
🔒 Authenticated. Create Razorpay order.

**Request:**
```json
{ "orderId": "..." }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_xxx",
    "amount": 39000,
    "currency": "INR",
    "key": "rzp_test_xxx"
  }
}
```

---

### POST `/api/payments/verify`
🔒 Authenticated. Verify Razorpay payment signature.

**Request:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_hash",
  "orderId": "..."
}
```

---

### POST `/api/payments/webhook`
Razorpay webhook handler. Verifies `x-razorpay-signature` header.

---

## Admin Routes (`/api/admin`)

All admin routes require `Authorization` and `role: admin`.

### GET `/api/admin/stats`
Dashboard statistics.

### GET `/api/admin/users?page=1&limit=20&role=user&search=rajesh`
List all users.

### PATCH `/api/admin/users/:id`
Update user (isActive, role).

### GET `/api/admin/restaurants`
List all restaurants with owner info.

### GET `/api/admin/orders?page=1&status=placed`
List all orders.

### PATCH `/api/admin/orders/:id/assign`
Assign delivery with estimated time.

### GET `/api/admin/commissions`
Revenue and commission data per restaurant.

### PATCH `/api/admin/commissions/:restaurantId`
Update commission rate.

### GET `/api/admin/coupons`
List all coupons.

### POST `/api/admin/coupons`
Create coupon.

**Request:**
```json
{
  "code": "NEWCOUPON",
  "type": "percentage",
  "value": 10,
  "minCartValue": 200,
  "maxDiscount": 50,
  "expiryDate": "2025-12-31"
}
```

---

## Upload Routes (`/api/upload`)

### POST `/api/upload`
🔒 Authenticated. Upload image (multipart/form-data).

**Field:** `image` (max 5MB, jpg/png/webp)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/uploads/image-1234567890.jpg",
    "filename": "image-1234567890.jpg"
  }
}
```

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join:user` | `userId` | Join user's room |
| `join:restaurant` | `restaurantId` | Join restaurant room |
| `join:admin` | - | Join admin room |
| `track:order` | `orderId` | Subscribe to order updates |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `order:new` | `Order` | New order received (restaurant/admin) |
| `order:status` | `{orderId, status, note}` | Order status updated |
| `notification` | `{message, type}` | General notification |

---

## Error Responses

```json
{
  "success": false,
  "error": "Error message here",
  "details": [
    { "field": "mobile", "message": "Invalid Indian mobile number" }
  ]
}
```

## HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error
