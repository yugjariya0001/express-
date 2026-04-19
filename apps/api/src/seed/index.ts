import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Station } from '../models/Station';
import { Train } from '../models/Train';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { FoodItem } from '../models/FoodItem';
import { Coupon } from '../models/Coupon';

const stationsData = [
  { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi', lat: 28.6431, lng: 77.2197 },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra', lat: 18.9696, lng: 72.8196 },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal', lat: 22.5839, lng: 88.3425 },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { code: 'LKO', name: 'Lucknow NR', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { code: 'VSKP', name: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana', lat: 17.4399, lng: 78.4983 },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
];

const trainsData = [
  {
    number: '12301',
    name: 'Rajdhani Express',
    fromCode: 'NDLS',
    toCode: 'HWH',
    runningDays: [0, 1, 2, 3, 4, 5, 6],
    stopCodes: ['NDLS', 'LKO', 'BPL', 'HWH'],
    times: [
      { dep: '16:55' },
      { arr: '22:45', dep: '22:55', day: 1 },
      { arr: '08:30', dep: '08:35', day: 2 },
      { arr: '09:45', day: 2 },
    ],
    distances: [0, 509, 1077, 1447],
  },
  {
    number: '12951',
    name: 'Mumbai Rajdhani',
    fromCode: 'NDLS',
    toCode: 'MMCT',
    runningDays: [0, 1, 2, 3, 4, 5, 6],
    stopCodes: ['NDLS', 'BPL', 'ADI', 'MMCT'],
    times: [
      { dep: '16:00' },
      { arr: '01:25', dep: '01:35', day: 2 },
      { arr: '07:25', dep: '07:35', day: 2 },
      { arr: '08:35', day: 2 },
    ],
    distances: [0, 706, 935, 1386],
  },
  {
    number: '12627',
    name: 'Karnataka Express',
    fromCode: 'NDLS',
    toCode: 'SBC',
    runningDays: [0, 1, 2, 3, 4, 5, 6],
    stopCodes: ['NDLS', 'BPL', 'SC', 'SBC'],
    times: [
      { dep: '22:30' },
      { arr: '10:15', dep: '10:20', day: 2 },
      { arr: '06:15', dep: '06:20', day: 3 },
      { arr: '11:00', day: 3 },
    ],
    distances: [0, 706, 1747, 2444],
  },
  {
    number: '12859',
    name: 'Gitanjali Express',
    fromCode: 'MMCT',
    toCode: 'HWH',
    runningDays: [0, 1, 2, 3, 4, 5, 6],
    stopCodes: ['MMCT', 'PUNE', 'SC', 'VSKP', 'HWH'],
    times: [
      { dep: '06:05' },
      { arr: '09:44', dep: '09:49', day: 1 },
      { arr: '22:00', dep: '22:15', day: 1 },
      { arr: '07:50', dep: '07:55', day: 2 },
      { arr: '13:50', day: 2 },
    ],
    distances: [0, 192, 712, 1099, 1968],
  },
  {
    number: '12657',
    name: 'Chennai Mail',
    fromCode: 'MAS',
    toCode: 'NDLS',
    runningDays: [0, 1, 2, 3, 4, 5, 6],
    stopCodes: ['MAS', 'SC', 'BPL', 'JP', 'NDLS'],
    times: [
      { dep: '23:30' },
      { arr: '09:05', dep: '09:15', day: 2 },
      { arr: '22:30', dep: '22:40', day: 2 },
      { arr: '04:00', dep: '04:10', day: 3 },
      { arr: '10:30', day: 3 },
    ],
    distances: [0, 659, 1443, 1813, 2183],
  },
];

const restaurantMenus: Record<string, { name: string; description: string; price: number; category: string; isVeg: boolean }[]> = {
  north: [
    { name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry', price: 220, category: 'Main Course', isVeg: false },
    { name: 'Dal Makhani', description: 'Slow-cooked black lentils in butter and cream', price: 160, category: 'Main Course', isVeg: true },
    { name: 'Paneer Tikka Masala', description: 'Cottage cheese in spiced gravy', price: 200, category: 'Main Course', isVeg: true },
    { name: 'Chicken Biryani', description: 'Fragrant basmati rice with tender chicken', price: 250, category: 'Rice', isVeg: false },
    { name: 'Veg Biryani', description: 'Aromatic rice with mixed vegetables', price: 180, category: 'Rice', isVeg: true },
    { name: 'Tandoori Roti', description: 'Whole wheat bread baked in tandoor', price: 30, category: 'Bread', isVeg: true },
    { name: 'Butter Naan', description: 'Soft leavened flatbread with butter', price: 40, category: 'Bread', isVeg: true },
    { name: 'Gulab Jamun', description: 'Soft milk-solid dumplings in sugar syrup', price: 80, category: 'Dessert', isVeg: true },
    { name: 'Mango Lassi', description: 'Thick yogurt drink with fresh mango', price: 70, category: 'Beverages', isVeg: true },
    { name: 'Masala Chai', description: 'Spiced Indian tea', price: 30, category: 'Beverages', isVeg: true },
    { name: 'Samosa (2 pcs)', description: 'Crispy pastry filled with spiced potatoes', price: 50, category: 'Snacks', isVeg: true },
    { name: 'Chicken Tikka', description: 'Marinated chicken pieces grilled in tandoor', price: 240, category: 'Starters', isVeg: false },
  ],
  south: [
    { name: 'Masala Dosa', description: 'Crispy crepe filled with spiced potatoes', price: 120, category: 'Main Course', isVeg: true },
    { name: 'Idli Sambar (3 pcs)', description: 'Steamed rice cakes with lentil soup', price: 90, category: 'Breakfast', isVeg: true },
    { name: 'Vada (2 pcs)', description: 'Crispy fried lentil doughnuts', price: 70, category: 'Snacks', isVeg: true },
    { name: 'Chettinad Chicken Curry', description: 'Spicy South Indian chicken curry', price: 230, category: 'Main Course', isVeg: false },
    { name: 'Fish Fry', description: 'Marinated fish fried with coastal spices', price: 200, category: 'Starters', isVeg: false },
    { name: 'Rasam', description: 'Thin tomato-based spiced soup', price: 60, category: 'Soup', isVeg: true },
    { name: 'Filter Coffee', description: 'Traditional South Indian decoction coffee', price: 40, category: 'Beverages', isVeg: true },
    { name: 'Pongal', description: 'Rice and lentil porridge with ghee', price: 100, category: 'Breakfast', isVeg: true },
    { name: 'Hyderabadi Biryani', description: 'Dum-cooked aromatic biryani', price: 280, category: 'Rice', isVeg: false },
    { name: 'Payasam', description: 'Sweet vermicelli pudding', price: 80, category: 'Dessert', isVeg: true },
  ],
  fast_food: [
    { name: 'Veg Burger', description: 'Crispy veg patty with fresh veggies', price: 120, category: 'Burgers', isVeg: true },
    { name: 'Chicken Burger', description: 'Grilled chicken patty with sauce', price: 160, category: 'Burgers', isVeg: false },
    { name: 'French Fries', description: 'Golden crispy potato fries', price: 80, category: 'Snacks', isVeg: true },
    { name: 'Veg Pizza (7")', description: 'Classic vegetarian pizza', price: 180, category: 'Pizza', isVeg: true },
    { name: 'Chicken Pizza (7")', description: 'Loaded chicken pizza', price: 220, category: 'Pizza', isVeg: false },
    { name: 'Cold Coffee', description: 'Chilled blended coffee', price: 90, category: 'Beverages', isVeg: true },
    { name: 'Fresh Lime Soda', description: 'Refreshing lime soda', price: 50, category: 'Beverages', isVeg: true },
    { name: 'Pasta Arrabbiata', description: 'Penne in spicy tomato sauce', price: 160, category: 'Pasta', isVeg: true },
    { name: 'Chocolate Brownie', description: 'Warm fudgy chocolate brownie', price: 100, category: 'Dessert', isVeg: true },
  ],
};

const restaurantsData = [
  { name: 'Delhi Darbar', cuisine: ['North Indian', 'Mughlai'], menuType: 'north', stationCodes: ['NDLS', 'LKO'] },
  { name: 'Punjabi Tadka', cuisine: ['North Indian', 'Punjabi'], menuType: 'north', stationCodes: ['NDLS', 'JP'] },
  { name: 'Mumbai Street Bites', cuisine: ['Fast Food', 'Snacks'], menuType: 'fast_food', stationCodes: ['MMCT', 'PUNE'] },
  { name: 'Udupi Palace', cuisine: ['South Indian', 'Vegetarian'], menuType: 'south', stationCodes: ['MAS', 'SBC'] },
  { name: 'Spice Garden', cuisine: ['South Indian', 'Chettinad'], menuType: 'south', stationCodes: ['MAS', 'SC'] },
  { name: 'Bengal Kitchen', cuisine: ['Bengali', 'Seafood'], menuType: 'north', stationCodes: ['HWH'] },
  { name: 'The Food Box', cuisine: ['Multi Cuisine', 'Fast Food'], menuType: 'fast_food', stationCodes: ['SBC', 'SC'] },
  { name: 'Rajasthani Rasoi', cuisine: ['Rajasthani', 'North Indian'], menuType: 'north', stationCodes: ['JP'] },
  { name: 'Ahmedabad Aangan', cuisine: ['Gujarati', 'North Indian'], menuType: 'north', stationCodes: ['ADI'] },
  { name: 'Hyderabad House', cuisine: ['Hyderabadi', 'Biryani'], menuType: 'south', stationCodes: ['SC', 'VSKP'] },
];

const couponsData = [
  { code: 'FIRST50', type: 'flat' as const, value: 50, minCartValue: 200, expiryDate: new Date(Date.now() + 90 * 86400000) },
  { code: 'SAVE20', type: 'percentage' as const, value: 20, minCartValue: 300, maxDiscount: 100, expiryDate: new Date(Date.now() + 60 * 86400000) },
  { code: 'TRAIN100', type: 'flat' as const, value: 100, minCartValue: 500, expiryDate: new Date(Date.now() + 30 * 86400000) },
  { code: 'WELCOME', type: 'percentage' as const, value: 15, minCartValue: 150, maxDiscount: 75, expiryDate: new Date(Date.now() + 180 * 86400000) },
];

async function seed() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Station.deleteMany({}),
      Train.deleteMany({}),
      User.deleteMany({ role: { $ne: 'admin' } }),
      Restaurant.deleteMany({}),
      FoodItem.deleteMany({}),
      Coupon.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create stations
    const stations = await Station.insertMany(stationsData);
    const stationMap = new Map(stations.map((s) => [s.code, s._id]));
    console.log(`Created ${stations.length} stations`);

    // Create restaurant owner users
    const owners = await User.insertMany(
      restaurantsData.map((_, i) => ({
        mobile: `9${String(800000000 + i).padStart(9, '0')}`,
        name: `Owner ${i + 1}`,
        role: 'restaurant',
        isActive: true,
      }))
    );

    // Create admin user
    await User.create({
      mobile: '9999999999',
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    });
    console.log('Created admin user (mobile: 9999999999)');

    // Create trains
    const trainDocs = trainsData.map((t) => ({
      number: t.number,
      name: t.name,
      from: stationMap.get(t.fromCode),
      to: stationMap.get(t.toCode),
      runningDays: t.runningDays,
      schedule: t.stopCodes.map((code, i) => ({
        station: stationMap.get(code),
        arrivalTime: t.times[i]?.arr,
        departureTime: t.times[i]?.dep,
        day: t.times[i]?.day || 1,
        distance: t.distances[i],
      })),
    }));

    await Train.insertMany(trainDocs);
    console.log(`Created ${trainDocs.length} trains`);

    // Create restaurants
    const restaurantDocs = await Promise.all(
      restaurantsData.map(async (r, i) => {
        const stationIds = r.stationCodes
          .map((code) => stationMap.get(code))
          .filter(Boolean);

        const restaurant = await Restaurant.create({
          name: r.name,
          owner: owners[i]._id,
          stations: stationIds,
          cuisine: r.cuisine,
          rating: 3.5 + Math.random() * 1.5,
          totalRatings: Math.floor(50 + Math.random() * 500),
          isOpen: true,
          isActive: true,
          commissionRate: 10 + Math.floor(Math.random() * 10),
        });

        const menu = restaurantMenus[r.menuType];
        const foodItems = menu.map((item) => ({
          ...item,
          restaurant: restaurant._id,
          isAvailable: true,
          rating: 3 + Math.random() * 2,
        }));

        await FoodItem.insertMany(foodItems);
        return restaurant;
      })
    );

    console.log(`Created ${restaurantDocs.length} restaurants with menus`);

    // Create coupons
    await Coupon.insertMany(couponsData);
    console.log(`Created ${couponsData.length} coupons`);

    console.log('\n✅ Seed completed successfully!');
    console.log('📱 Admin login: mobile 9999999999');
    console.log('🎟️  Coupons: FIRST50, SAVE20, TRAIN100, WELCOME');
    console.log('🚂 Test PNR: any 10-digit number e.g., 1234567890');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
