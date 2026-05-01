const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const Hotel = require('../src/models/Hotel');
const Transportation = require('../src/models/Transportation');
const Booking = require('../src/models/Booking');

const ROOM_ADULT_CAPACITY = 2;
const ROOM_CHILD_CAPACITY = 2;

const transportSeed = [
  {
    vehicleType: 'Sedan',
    brandModel: 'Toyota Prius Hybrid',
    plateNumber: 'CAA-4582',
    capacity: 4,
    price: 9500,
    description: 'Fuel-efficient private transfer for airport pickups, city travel, and intercity journeys.',
    vehicleImage:
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    vehicleType: 'Van',
    brandModel: 'Toyota KDH High Roof',
    plateNumber: 'NC-7812',
    capacity: 8,
    price: 18000,
    description: 'Comfortable group transport with luggage space for family tours and hill country routes.',
    vehicleImage:
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    vehicleType: 'Mini Coach',
    brandModel: 'Mitsubishi Rosa',
    plateNumber: 'NA-2314',
    capacity: 20,
    price: 42000,
    description: 'Best suited for large group excursions, corporate tours, and multi-stop itineraries.',
    vehicleImage:
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
  },
  {
    vehicleType: 'Compact',
    brandModel: 'Suzuki Wagon R',
    plateNumber: 'CAB-9941',
    capacity: 3,
    price: 7000,
    description: 'Budget-friendly local transfer for solo travelers or couples with light baggage.',
    vehicleImage:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  },
];

const hotelSeed = [
  {
    name: 'Cinnamon Grand Colombo',
    location: 'Colombo 03, Sri Lanka',
    description:
      'A premium city hotel in the heart of Colombo with dining venues, meeting spaces, and easy access to shopping and business districts.',
    pricePerNight: 48500,
    totalRooms: 42,
    availableRooms: 42,
    amenities: ['Pool', 'Spa', 'WiFi', 'Gym', 'Conference Hall', 'Airport Transfer'],
    image:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
    rating: 4.7,
    accommodationType: 'City Hotel',
    contactNumber: '+94 11 249 7373',
  },
  {
    name: 'Jetwing Blue Negombo',
    location: 'Negombo Beach, Sri Lanka',
    description:
      'Beachfront accommodation with ocean views, easy airport access, and a laid-back coastal atmosphere ideal for short escapes.',
    pricePerNight: 23000,
    totalRooms: 30,
    availableRooms: 30,
    amenities: ['Beach Access', 'Pool', 'Restaurant', 'WiFi', 'Sea View'],
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    rating: 4.4,
    accommodationType: 'Beach Resort',
    contactNumber: '+94 31 227 3500',
  },
  {
    name: 'Heritance Kandalama',
    location: 'Dambulla, Sri Lanka',
    description:
      'A nature-integrated luxury stay overlooking Kandalama Lake, popular for cultural triangle visits and quiet scenic retreats.',
    pricePerNight: 36500,
    totalRooms: 26,
    availableRooms: 26,
    amenities: ['Lake View', 'Infinity Pool', 'Spa', 'WiFi', 'Nature Trails'],
    image:
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80',
    rating: 4.8,
    accommodationType: 'Eco Resort',
    contactNumber: '+94 66 555 5000',
  },
  {
    name: '98 Acres Resort & Spa',
    location: 'Ella, Sri Lanka',
    description:
      'A hillside resort surrounded by tea estates with dramatic views, ideal for couples and mountain getaway itineraries.',
    pricePerNight: 72000,
    totalRooms: 18,
    availableRooms: 18,
    amenities: ['Mountain View', 'Spa', 'Restaurant', 'WiFi', 'Hiking Access'],
    image:
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80',
    rating: 4.9,
    accommodationType: 'Boutique Resort',
    contactNumber: '+94 57 205 5050',
  },
  {
    name: 'Amaya Hills Kandy',
    location: 'Heerassagala, Kandy, Sri Lanka',
    description:
      'A hilltop hotel with classic Kandyan character, convenient for temple visits, lake tours, and cooler central highland stays.',
    pricePerNight: 28500,
    totalRooms: 34,
    availableRooms: 34,
    amenities: ['Hill View', 'Pool', 'WiFi', 'Restaurant', 'Family Rooms'],
    image:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80',
    rating: 4.3,
    accommodationType: 'Hill Country Hotel',
    contactNumber: '+94 81 447 4020',
  },
];

const bookingSeed = [
  {
    guestName: 'Daniel Perera',
    email: 'daniel.perera@example.com',
    phone: '+94 77 451 2288',
    destination: 'Colombo 03, Sri Lanka',
    checkInDate: '2026-05-12',
    checkOutDate: '2026-05-15',
    adults: 2,
    children: 1,
    travelStyle: 'Luxury',
    specialRequests: 'High floor room and airport pickup.',
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
    hotelName: 'Cinnamon Grand Colombo',
    transportPlate: 'CAA-4582',
  },
  {
    guestName: 'Ayesha Fernando',
    email: 'ayesha.fernando@example.com',
    phone: '+94 71 882 1944',
    destination: 'Ella, Sri Lanka',
    checkInDate: '2026-05-18',
    checkOutDate: '2026-05-20',
    adults: 4,
    children: 2,
    travelStyle: 'Family',
    specialRequests: 'Adjacent rooms preferred.',
    bookingStatus: 'pending',
    paymentStatus: 'deposit_due',
    hotelName: '98 Acres Resort & Spa',
    transportPlate: 'NC-7812',
  },
];

const calculateNights = (checkInDate, checkOutDate) => {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const calculateRequiredRooms = (adults, children) =>
  Math.max(
    Math.ceil(adults / ROOM_ADULT_CAPACITY),
    Math.ceil(children / ROOM_CHILD_CAPACITY),
    1
  );

const createReference = (() => {
  let counter = 100;
  return () => {
    counter += 1;
    return `TRIP-${counter}`;
  };
})();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    console.log('Connected. Replacing hotels, transportation, and bookings...');

    await Booking.deleteMany({});
    await Hotel.deleteMany({});
    await Transportation.deleteMany({});

    const transports = await Transportation.insertMany(transportSeed);
    const hotels = await Hotel.insertMany(hotelSeed);

    const hotelByName = Object.fromEntries(hotels.map((hotel) => [hotel.name, hotel]));
    const transportByPlate = Object.fromEntries(transports.map((transport) => [transport.plateNumber, transport]));

    for (const entry of bookingSeed) {
      const hotel = hotelByName[entry.hotelName];
      const transportation = transportByPlate[entry.transportPlate];
      const nights = calculateNights(entry.checkInDate, entry.checkOutDate);
      const rooms = calculateRequiredRooms(entry.adults, entry.children);
      const guests = entry.adults + entry.children;
      const stayAmount = hotel.pricePerNight * rooms * nights;
      const transportationAmount = transportation ? transportation.price : 0;
      const serviceFee = Math.round(stayAmount * 0.08);
      const totalAmount = stayAmount + transportationAmount + serviceFee;

      await Booking.create({
        bookingReference: createReference(),
        guestName: entry.guestName,
        email: entry.email,
        phone: entry.phone,
        destination: entry.destination,
        hotel: hotel._id,
        transportation: transportation ? transportation._id : null,
        checkInDate: entry.checkInDate,
        checkOutDate: entry.checkOutDate,
        adults: entry.adults,
        children: entry.children,
        guests,
        rooms,
        nights,
        stayAmount,
        transportationAmount,
        serviceFee,
        totalAmount,
        bookingStatus: entry.bookingStatus,
        paymentStatus: entry.paymentStatus,
        travelStyle: entry.travelStyle,
        specialRequests: entry.specialRequests,
        itineraryNotes: [
          `${entry.adults} adult(s) and ${entry.children} child(ren)`,
          `${rooms} room(s) required`,
          transportation ? `Transfer via ${transportation.brandModel || transportation.vehicleType}` : 'No transfer selected',
        ],
      });

      hotel.availableRooms -= rooms;
      await hotel.save();
    }

    console.log('Seed complete.');
    console.log(`Hotels: ${await Hotel.countDocuments()}`);
    console.log(`Transportation: ${await Transportation.countDocuments()}`);
    console.log(`Bookings: ${await Booking.countDocuments()}`);
  } finally {
    await mongoose.disconnect();
  }
};

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
