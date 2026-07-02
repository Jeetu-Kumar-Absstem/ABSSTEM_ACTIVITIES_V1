// src/utils/constants.js
export const SLOTS = [
  { id: 1, label: 'Slot 1', startTime: '11:00', endTime: '11:30', time: '11:00 AM - 11:30 AM' },
  { id: 2, label: 'Slot 2', startTime: '11:30', endTime: '12:00', time: '11:30 AM - 12:00 PM' },
  { id: 3, label: 'Slot 3', startTime: '12:00', endTime: '12:30', time: '12:00 PM - 12:30 PM' },
  { id: 4, label: 'Slot 4', startTime: '12:30', endTime: '13:00', time: '12:30 PM - 1:00 PM' },
  { id: 5, label: 'Slot 5', startTime: '13:00', endTime: '13:30', time: '1:00 PM - 1:30 PM' },
  { id: 6, label: 'Slot 6', startTime: '13:30', endTime: '14:00', time: '1:30 PM - 2:00 PM' },
  { id: 7, label: 'Slot 7', startTime: '14:00', endTime: '14:30', time: '2:00 PM - 2:30 PM' },
  { id: 8, label: 'Slot 8', startTime: '14:30', endTime: '15:00', time: '2:30 PM - 3:00 PM' },
  { id: 9, label: 'Slot 9', startTime: '15:00', endTime: '15:30', time: '3:00 PM - 3:30 PM' },
  { id: 10, label: 'Slot 10', startTime: '15:30', endTime: '16:00', time: '3:30 PM - 4:00 PM' },
  { id: 11, label: 'Slot 11', startTime: '16:00', endTime: '16:30', time: '4:00 PM - 4:30 PM' },
  { id: 12, label: 'Slot 12', startTime: '16:30', endTime: '17:00', time: '4:30 PM - 5:00 PM' },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Games with specific max players
export const GAMES = [
  { id: 'carrom', name: 'Carrom', icon: 'CARROM', location: 'Recreation Room - 2nd Floor', maxPlayers: 4 },
  { id: 'chess', name: 'Chess', icon: 'CHESS', location: 'Conference Room - 1st Floor', maxPlayers: 2 },
];

export const DEPARTMENTS = [
  { id: 'svc', label: 'Service', class: 'dt-svc' },
  { id: 'sls', label: 'Sales', class: 'dt-sls' },
  { id: 'acc', label: 'Accounts', class: 'dt-acc' },
  { id: 'hr', label: 'HR', class: 'dt-hr' },
  { id: 'rd', label: 'R&D', class: 'dt-rd' },
  { id: 'ops', label: 'Operations', class: 'dt-ops' },
];

export const RULES_DATA = [
  { id: 1, game: 'General', text: 'Bookings are permitted for a maximum of one game per day.', type: 'standard' },
  { id: 2, game: 'General', text: 'If a member fails to utilize their reserved time slot, the booking will be considered forfeited and will not be carried forward.', type: 'standard' },
  { id: 3, game: 'General', text: 'Bookings can be entered or cancelled up to 15 minutes before the scheduled time. The member only enters their own name.', type: 'standard' },
  { id: 4, game: 'General', text: 'Only one active booking per player per game per day. If a player fails to show up within 10 minutes of the booked time, the slot may be given to someone else. Players must maintain silence and avoid disturbing others. No use of mobile phones or loud conversations during the game.', type: 'critical' },
  { id: 5, game: 'General', text: 'Each time slot has a fixed duration. Members must vacate at the end of their session to allow smooth transition for the next user.', type: 'standard' },
  { id: 6, game: 'General', text: 'Members are expected to maintain cleanliness and follow game etiquette. Improper behavior or damage may result in suspension of booking privileges. Report any missing or damaged items to the manager.', type: 'standard' },
  { id: 7, game: 'Carrom', text: 'Please ask for carrom coins from Mr. Abhishek and hand them back at the end of your slot.', type: 'standard' },
  { id: 8, game: 'Carrom', text: 'Do not move the carrom board from its location.', type: 'standard' },
  { id: 9, game: 'General', text: 'For any suggestions regarding usage or time slots, please contact Mr. Abhishek (+91-9289132909).', type: 'standard' },
  { id: 10, game: 'General', text: 'If you are getting blocked every month for 3 consecutive months, you will be automatically blocked for the upcoming 3 months. If the blocked person has any questions, kindly direct them to Mr. Abhishek Mishra for any clarification.', type: 'critical' },
];
