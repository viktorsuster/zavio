import { Court, Post, User, Booking } from './types';

export const MOCK_COURTS: Court[] = [
  {
    id: 'c1',
    name: 'Arena Nivy - Futbal',
    type: 'football',
    pricePerHour: 20,
    image: 'https://picsum.photos/800/400?random=1',
    location: 'Bratislava, Nivy'
  },
  {
    id: 'c2',
    name: 'Tenis Centrum',
    type: 'tennis',
    pricePerHour: 15,
    image: 'https://picsum.photos/800/400?random=2',
    location: 'Košice, Juh'
  },
  {
    id: 'c3',
    name: 'Street Basket',
    type: 'basketball',
    pricePerHour: 10,
    image: 'https://picsum.photos/800/400?random=3',
    location: 'Žilina'
  },
  {
    id: 'c4',
    name: 'Padel Pro',
    type: 'padel',
    pricePerHour: 24,
    image: 'https://picsum.photos/800/400?random=4',
    location: 'Bratislava, Rača'
  }
];

export const MOCK_USER: User = {
  id: 'me',
  name: 'Martin Novák',
  email: 'martin@example.com',
  avatar: 'https://picsum.photos/100/100?random=7',
  credits: 150,
  interests: ['Futbal', 'Padel', 'Tenis']
};

export const MOCK_ALL_USERS: User[] = [
  MOCK_USER,
  {
    id: 'u2',
    name: 'Jano Hráč',
    email: 'jano@example.com',
    avatar: 'https://picsum.photos/100/100?random=5',
    credits: 0,
    interests: ['Futbal', 'Basketbal']
  },
  {
    id: 'u3',
    name: 'Petra Tenisová',
    email: 'petra@example.com',
    avatar: 'https://picsum.photos/100/100?random=6',
    credits: 0,
    interests: ['Tenis', 'Padel', 'Bedminton']
  }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'p1',
    userId: 'u2',
    userName: 'Jano Hráč',
    userAvatar: 'https://picsum.photos/100/100?random=5',
    content: 'Dnes super zápas na Nivy aréne! ⚽️ Vyhrali sme 10:8. Bola to skvelá hra, všetci sme dali maximum!',
    timestamp: Date.now() - 3600000,
    likes: 12,
    likedBy: ['me', 'u3', 'u2'],
    image: 'https://picsum.photos/800/600?random=10',
    comments: [
      {
        id: 'c1',
        userId: 'u3',
        userName: 'Petra Tenisová',
        userAvatar: 'https://picsum.photos/100/100?random=6',
        content: 'Gratulujem! 🎉',
        timestamp: Date.now() - 3300000,
        likes: 3,
        likedBy: ['me', 'u2']
      },
      {
        id: 'c2',
        userId: 'me',
        userName: 'Martin Novák',
        userAvatar: 'https://picsum.photos/100/100?random=7',
        content: 'Super hra! Nabudúce sa pridám.',
        timestamp: Date.now() - 3000000,
        likes: 1,
        likedBy: ['u2']
      }
    ]
  },
  {
    id: 'p2',
    userId: 'u3',
    userName: 'Petra Tenisová',
    userAvatar: 'https://picsum.photos/100/100?random=6',
    content: 'Hľadám parťáka na tenis zajtra o 18:00. Kto sa pridá? 🎾',
    timestamp: Date.now() - 7200000,
    likes: 5,
    likedBy: ['me', 'u2'],
    comments: [
      {
        id: 'c3',
        userId: 'me',
        userName: 'Martin Novák',
        userAvatar: 'https://picsum.photos/100/100?random=7',
        content: 'Ja mám záujem!',
        timestamp: Date.now() - 6900000,
        likes: 2,
        likedBy: ['u3', 'u2']
      }
    ]
  },
  {
    id: 'p3',
    userId: 'me',
    userName: 'Martin Novák',
    userAvatar: 'https://picsum.photos/100/100?random=7',
    content: 'Nové ihrisko v Rači je top! 🏀 Odporúčam všetkým basketbalistom.',
    timestamp: Date.now() - 10800000,
    likes: 8,
    likedBy: ['u2', 'u3'],
    image: 'https://picsum.photos/800/600?random=11',
    comments: []
  }
];

const generateSmartBookings = (): Booking[] => {
  const bookings: Booking[] = [];
  const today = new Date();
  const occupancyProfile = [0.90, 0.80, 0.60, 0.40, 0.20, 0.10, 0.05];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const chance = occupancyProfile[dayOffset] || 0.05;
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];

    MOCK_COURTS.forEach(court => {
      let currentMinutes = 7 * 60;
      const endMinutes = 22 * 60;

      while (currentMinutes < endMinutes) {
        const isBooked = Math.random() < chance;
        const duration = [60, 90, 60, 120, 90][Math.floor(Math.random() * 5)];

        if (isBooked) {
          const h = Math.floor(currentMinutes / 60);
          const m = currentMinutes % 60;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

          bookings.push({
            id: `auto_${court.id}_${dateStr}_${timeStr}`,
            courtId: court.id,
            userId: 'ghost_player',
            date: dateStr,
            time: timeStr,
            duration: duration,
            status: 'confirmed',
            pricePaid: 0
          });

          currentMinutes += duration;
        } else {
          currentMinutes += 15;
        }
      }
    });
  }

  return bookings;
};

export const INITIAL_BOOKINGS: Booking[] = generateSmartBookings();

