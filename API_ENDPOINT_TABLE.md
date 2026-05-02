# Tourism Management System API Endpoint Table

Base URL: `http://localhost:5000`

Notes:
- All currently implemented endpoints are public. The backend issues JWTs for login/register, but no route middleware enforces authentication yet.
- JSON is used for request and response payloads.
- IDs in path params are MongoDB document IDs.

## Endpoint Summary

| Module | Method | Endpoint | Purpose | Request Body / Params | Success Response |
|---|---|---|---|---|---|
| Status | `GET` | `/api/status` | Check backend health | None | `200` with `status`, `message`, `timestamp`, `environment` |
| Users | `POST` | `/api/users/register` | Register a new user | Body: `name`, `email`, `password` | `201` with `_id`, `name`, `email`, `role`, `token` |
| Users | `POST` | `/api/users/login` | Authenticate existing user | Body: `email`, `password` | `200` with `_id`, `name`, `email`, `role`, `token` |
| Hotels | `GET` | `/api/hotels` | List all hotels/accommodations | None | `200` with hotel array |
| Hotels | `POST` | `/api/hotels` | Create a hotel/accommodation | Body: `name`, `location`, `description`, `pricePerNight`, `totalRooms`, `availableRooms`, `amenities[]`, `image`, `rating`, `accommodationType`, `contactNumber` | `201` with created hotel object |
| Hotels | `GET` | `/api/hotels/:id` | Get hotel by ID | Param: `id` | `200` with hotel object |
| Hotels | `PUT` | `/api/hotels/:id` | Update hotel by ID | Param: `id`, body supports same hotel fields | `200` with updated hotel object |
| Hotels | `DELETE` | `/api/hotels/:id` | Delete hotel by ID | Param: `id` | `200` with `{ message: "Hotel removed" }` |
| Transportation | `GET` | `/api/transportation` | List all vehicles | None | `200` with transportation array |
| Transportation | `POST` | `/api/transportation` | Add a vehicle | Body: `vehicleType`, `brandModel`, `plateNumber`, `capacity`, `price`, `description`, `vehicleImage` | `201` with created transportation object |
| Bookings | `GET` | `/api/bookings` | List all bookings | None | `200` with populated booking array |
| Bookings | `POST` | `/api/bookings` | Create a booking | Body: see detailed booking payload below | `201` with created populated booking object |
| Bookings | `GET` | `/api/bookings/:id` | Get booking by ID | Param: `id` | `200` with populated booking object |
| Bookings | `PATCH` | `/api/bookings/:id` | Update booking status or payment status | Param: `id`, body: `bookingStatus`, `paymentStatus` | `200` with updated populated booking object |
| Bookings | `DELETE` | `/api/bookings/:id` | Delete booking by ID | Param: `id` | `200` with `{ message: "Booking removed" }` |

## Detailed Request Fields

### 1. `POST /api/users/register`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | User display name |
| `email` | string | Yes | Must be unique |
| `password` | string | Yes | Hashed before save |

### 2. `POST /api/users/login`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Existing user email |
| `password` | string | Yes | Compared with hashed password |

### 3. `POST /api/hotels`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Hotel/accommodation name |
| `location` | string | Yes | Destination or area |
| `description` | string | Yes | Hotel description |
| `pricePerNight` | number | Yes | Must be greater than `0` |
| `totalRooms` | number | Yes | Must be greater than `0` |
| `availableRooms` | number | Yes | Cannot exceed `totalRooms` |
| `amenities` | string[] | No | Defaults to empty array |
| `image` | string | No | URL or base64 string |
| `rating` | number | No | Range `0` to `5` |
| `accommodationType` | string | Yes | Example: hotel, villa, resort |
| `contactNumber` | string | No | Hotel contact number |

### 4. `PUT /api/hotels/:id`

Same payload shape as hotel creation. Fields are updated selectively.

### 5. `POST /api/transportation`

| Field | Type | Required | Notes |
|---|---|---|---|
| `vehicleType` | string | Yes | Example: car, van, bus |
| `brandModel` | string | No | Vehicle model |
| `plateNumber` | string | Yes | Must be unique |
| `capacity` | number | Yes | Must be at least `1` |
| `price` | number | Yes | Cannot be negative |
| `description` | string | No | Transport description |
| `vehicleImage` | string | No | URL or base64 string |

### 6. `POST /api/bookings`

| Field | Type | Required | Notes |
|---|---|---|---|
| `guestName` | string | Yes | Trimmed before save |
| `email` | string | Yes | Must match email format |
| `phone` | string | Yes | Must match phone regex |
| `destination` | string | Yes | Trip destination |
| `hotel` | string | Yes | Hotel ObjectId |
| `transportation` | string/null | No | Transportation ObjectId |
| `checkInDate` | string/date | Yes | Must be before check-out |
| `checkOutDate` | string/date | Yes | Must be after check-in |
| `adults` | number | Yes | Minimum `1` |
| `children` | number | No | Minimum `0` |
| `travelStyle` | string | No | One of `Relax`, `Adventure`, `Family`, `Luxury`, `Work` |
| `specialRequests` | string | No | Free-text notes |
| `itineraryNotes` | string[] | No | Saved as array |

Server-calculated fields:
- `bookingReference`
- `guests`
- `rooms`
- `nights`
- `stayAmount`
- `transportationAmount`
- `serviceFee`
- `totalAmount`
- `bookingStatus`
- `paymentStatus`

Business rules:
- Required rooms are auto-calculated from adults/children.
- Hotel availability is reduced when a booking is created.
- If transportation is selected, guest count cannot exceed vehicle capacity.

### 7. `PATCH /api/bookings/:id`

| Field | Type | Required | Notes |
|---|---|---|---|
| `bookingStatus` | string | No | `pending`, `confirmed`, `completed`, `cancelled` |
| `paymentStatus` | string | No | `deposit_due`, `paid`, `refunded` |

Business rules:
- Cancelling a booking restores hotel room availability.
- Reactivating a cancelled booking reduces room availability again.
- Reactivation fails if rooms are no longer available.

## Common Error Responses

| Status Code | Typical Meaning |
|---|---|
| `400` | Validation error, duplicate record, invalid business rule |
| `401` | Invalid login credentials |
| `404` | Requested hotel, booking, or transportation not found |
| `500` | Server-side error |

## Frontend Usage Mapping

| Frontend Screen | Endpoints Used |
|---|---|
| Login | `POST /api/users/login` |
| Signup | `POST /api/users/register` |
| Hotel listing/details/edit | `GET /api/hotels`, `GET /api/hotels/:id`, `PUT /api/hotels/:id`, `DELETE /api/hotels/:id` |
| Add hotel | `POST /api/hotels` |
| Add transportation / transport selection | `GET /api/transportation`, `POST /api/transportation` |
| Booking flow | `GET /api/hotels/:id`, `GET /api/transportation`, `POST /api/bookings` |
| Admin dashboard | `GET /api/bookings` |
| Booking management | `GET /api/bookings`, `PATCH /api/bookings/:id`, `DELETE /api/bookings/:id` |

## Current API Count

Implemented backend endpoints: `14`
