import { Player, Team, Tournament, DetectionReport, Match } from '@r6ac/types';

// 8 Mock Teams
export const mockTeamsList = [
  { id: 'team_1', name: 'Shahin Esports', nameFA: 'تیم شاهین', captainId: 'player_1', createdAt: '2026-01-10T12:00:00Z' },
  { id: 'team_2', name: 'Azarakhsh Esports', nameFA: 'تیم آذرخش', captainId: 'player_6', createdAt: '2026-01-11T12:00:00Z' },
  { id: 'team_3', name: 'Cobra Esports', nameFA: 'تیم کبرا', captainId: 'player_11', createdAt: '2026-01-12T12:00:00Z' },
  { id: 'team_4', name: 'Damavand Esports', nameFA: 'تیم دماوند', captainId: 'player_16', createdAt: '2026-01-13T12:00:00Z' },
  { id: 'team_5', name: 'Simurgh Esports', nameFA: 'تیم سیمرغ', captainId: 'player_21', createdAt: '2026-01-14T12:00:00Z' },
  { id: 'team_6', name: 'Perspolis Esports', nameFA: 'تیم پرسپولیس', captainId: 'player_26', createdAt: '2026-01-15T12:00:00Z' },
  { id: 'team_7', name: 'Zagros Esports', nameFA: 'تیم زاگرس', captainId: 'player_31', createdAt: '2026-01-16T12:00:00Z' },
  { id: 'team_8', name: 'Alvand Esports', nameFA: 'تیم الوند', captainId: 'player_36', createdAt: '2026-01-17T12:00:00Z' },
];

const teamData = [
  { username: 'Sina_Sniper', usernameFA: 'سینا اسنایپر' },
  { username: 'Reza_Racer', usernameFA: 'رضا ریسور' },
  { username: 'Mamad_Ace', usernameFA: 'ممد ایس' },
  { username: 'Ali_Avenger', usernameFA: 'علی اونجر' },
  { username: 'Hossein_Hunter', usernameFA: 'حسین هانتر' },
  
  { username: 'Arash_Rogue', usernameFA: 'آرش روگ' },
  { username: 'Farhad_Fury', usernameFA: 'فرهاد فیوری' },
  { username: 'Saeed_Specter', usernameFA: 'سعید اسپکتر' },
  { username: 'Omid_Omega', usernameFA: 'امید امگا' },
  { username: 'Keyvan_Knight', usernameFA: 'کیوان نایت' },
  
  { username: 'Pejman_Prowler', usernameFA: 'پژمان پرولر' },
  { username: 'Kamran_Kestrel', usernameFA: 'کامران کسترل' },
  { username: 'Shayan_Shadow', usernameFA: 'شایان شدو' },
  { username: 'Pouya_Phantom', usernameFA: 'پویا فانتوم' },
  { username: 'Navid_Nemesis', usernameFA: 'نوید نمسیس' },
  
  { username: 'Aria_Alpha', usernameFA: 'آریا آلفا' },
  { username: 'Babak_Blade', usernameFA: 'بابک بلید' },
  { username: 'Soheil_Storm', usernameFA: 'سهیل استورم' },
  { username: 'Mehran_Maverick', usernameFA: 'مهران ماوریک' },
  { username: 'Arman_Apex', usernameFA: 'آرمان اپکس' },
  
  { username: 'Saman_Saber', usernameFA: 'سامان صابر' },
  { username: 'Ramin_Raptor', usernameFA: 'رامین رپتور' },
  { username: 'Ehsan_Echo', usernameFA: 'احسان اکو' },
  { username: 'Vahid_Viper', usernameFA: 'وحید وایپر' },
  { username: 'Javad_Jester', usernameFA: 'جواد جستر' },
  
  { username: 'Iman_Icon', usernameFA: 'ایمان آیکون' },
  { username: 'Milad_Mirage', usernameFA: 'میلاد میراژ' },
  { username: 'Soroush_Siren', usernameFA: 'سروش سایرن' },
  { username: 'Kaveh_Kodiak', usernameFA: 'کاوه کودیاک' },
  { username: 'Ashkan_Arrow', usernameFA: 'اشکان ارو' },
  
  { username: 'Yasin_Yeti', usernameFA: 'یاسین یتی' },
  { username: 'Zamyad_Zenith', usernameFA: 'زامیاد زنیت' },
  { username: 'Kourosh_Kaiser', usernameFA: 'کوروش قیصر' },
  { username: 'Morteza_Monarch', usernameFA: 'مرتضی مونارک' },
  { username: 'Nima_Nova', usernameFA: 'نیما نوا' },
  
  { username: 'Hamid_Hazard', usernameFA: 'حمید هازارد' },
  { username: 'Pooya_Pulse', usernameFA: 'پویا پالس' },
  { username: 'Sohrab_Scythe', usernameFA: 'سهراب سایث' },
  { username: 'Amir_Aegis', usernameFA: 'امیر ایجیس' },
  { username: 'Danyal_Dagger', usernameFA: 'دانیال دگر' },
];

// Generate 40 Mock Players
export const mockPlayers: Player[] = Array.from({ length: 40 }).map((_, index) => {
  const id = `player_${index + 1}`;
  const teamIndex = Math.floor(index / 5);
  const teamId = mockTeamsList[teamIndex].id;
  const isCaptain = index % 5 === 0;
  
  // Assign statuses dynamically
  let banStatus: 'clean' | 'flagged' | 'banned' = 'clean';
  if (index === 2) banStatus = 'flagged'; // Mamad_Ace is flagged
  if (index === 7) banStatus = 'banned';  // Saeed_Specter is banned
  if (index === 12) banStatus = 'flagged'; // Shayan_Shadow is flagged
  if (index === 18) banStatus = 'banned'; // Arman_Apex is banned
  if (index === 24) banStatus = 'flagged'; // Javad_Jester is flagged

  return {
    id,
    username: teamData[index].username,
    usernameFA: teamData[index].usernameFA,
    email: `${teamData[index].username.toLowerCase()}@r6ac.ir`,
    role: isCaptain ? 'team_captain' : 'player',
    teamId,
    banStatus,
    createdAt: new Date(2026, 0, index + 1).toISOString(),
    updatedAt: new Date(2026, 4, index + 1).toISOString(),
  };
});

// Construct Mock Teams populated with players
export const mockTeams: Team[] = mockTeamsList.map((t) => {
  return {
    ...t,
    players: mockPlayers.filter((p) => p.teamId === t.id),
  };
});

// 3 Mock Tournaments
export const mockTournaments: Tournament[] = [
  {
    id: 'tour_1',
    name: 'Shiraz Premier League 2026',
    nameFA: 'لیگ برتر شیراز ۱۴۰۵',
    status: 'active',
    maxTeams: 16,
    registeredTeams: 16,
    startDate: '2026-05-10T14:00:00Z',
    prizePool: 50000000,
    currency: 'IRR',
  },
  {
    id: 'tour_2',
    name: 'Tehran Champions Cup',
    nameFA: 'جام قهرمانان تهران',
    status: 'registration',
    maxTeams: 32,
    registeredTeams: 18,
    startDate: '2026-06-15T15:00:00Z',
    prizePool: 120000000,
    currency: 'IRR',
  },
  {
    id: 'tour_3',
    name: 'Isfahan Spring Cup',
    nameFA: 'جام بهاره اصفهان',
    status: 'upcoming',
    maxTeams: 16,
    registeredTeams: 4,
    startDate: '2026-07-01T10:00:00Z',
    prizePool: 30000000,
    currency: 'IRR',
  },
];

// 5 Active Matches
export const mockMatches: Match[] = [
  {
    id: 'match_1',
    tournamentId: 'tour_1',
    teamAId: 'team_1',
    teamBId: 'team_2',
    teamAName: 'Shahin Esports',
    teamBName: 'Azarakhsh Esports',
    teamANameFA: 'تیم شاهین',
    teamBNameFA: 'تیم آذرخش',
    durationSeconds: 1420,
    detectionAlertsCount: 3,
    status: 'live',
    createdAt: '2026-05-19T00:00:00Z',
  },
  {
    id: 'match_2',
    tournamentId: 'tour_1',
    teamAId: 'team_3',
    teamBId: 'team_4',
    teamAName: 'Cobra Esports',
    teamBName: 'Damavand Esports',
    teamANameFA: 'تیم کبرا',
    teamBNameFA: 'تیم دماوند',
    durationSeconds: 850,
    detectionAlertsCount: 0,
    status: 'live',
    createdAt: '2026-05-19T00:10:00Z',
  },
  {
    id: 'match_3',
    tournamentId: 'tour_1',
    teamAId: 'team_5',
    teamBId: 'team_6',
    teamAName: 'Simurgh Esports',
    teamBName: 'Perspolis Esports',
    teamANameFA: 'تیم سیمرغ',
    teamBNameFA: 'تیم پرسپولیس',
    durationSeconds: 120,
    detectionAlertsCount: 0,
    status: 'live',
    createdAt: '2026-05-19T00:20:00Z',
  },
  {
    id: 'match_4',
    tournamentId: 'tour_1',
    teamAId: 'team_7',
    teamBId: 'team_8',
    teamAName: 'Zagros Esports',
    teamBName: 'Alvand Esports',
    teamANameFA: 'تیم زاگرس',
    teamBNameFA: 'تیم الوند',
    durationSeconds: 2600,
    detectionAlertsCount: 1,
    status: 'paused',
    createdAt: '2026-05-18T23:30:00Z',
  },
  {
    id: 'match_5',
    tournamentId: 'tour_1',
    teamAId: 'team_1',
    teamBId: 'team_3',
    teamAName: 'Shahin Esports',
    teamBName: 'Cobra Esports',
    teamANameFA: 'تیم شاهین',
    teamBNameFA: 'تیم کبرا',
    durationSeconds: 3200,
    detectionAlertsCount: 5,
    status: 'ended',
    createdAt: '2026-05-18T21:00:00Z',
  },
];

// 30 Mock Detection Reports
export const mockDetectionReports: DetectionReport[] = [
  // Live / High confidence
  {
    id: 'rep_1',
    playerId: 'player_3', // Mamad_Ace
    matchId: 'match_1',
    detectionType: 'DMA_CARD',
    confidence: 0.98,
    reasonCode: 'DMA_HARDWARE_FPGA_POLLING',
    requiresHumanReview: false,
    autoAction: 'kick',
    reviewedBy: null,
    createdAt: '2026-05-19T00:15:30Z',
  },
  {
    id: 'rep_2',
    playerId: 'player_13', // Shayan_Shadow
    matchId: 'match_1',
    detectionType: 'KMBOX',
    confidence: 0.88,
    reasonCode: 'KMBOX_SERIAL_SIGNATURE_FOUND',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-19T00:18:22Z',
  },
  {
    id: 'rep_3',
    playerId: 'player_25', // Javad_Jester
    matchId: 'match_4',
    detectionType: 'AIMBOT',
    confidence: 0.94,
    reasonCode: 'AIM_LOCK_PITCH_YAW_DELTA_ZERO',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-18T23:45:10Z',
  },
  // Banned players reports (already actioned)
  {
    id: 'rep_4',
    playerId: 'player_8', // Saeed_Specter (banned)
    matchId: 'match_5',
    detectionType: 'WALLHACK',
    confidence: 0.99,
    reasonCode: 'ESP_OVERLAY_HOOK_DETECTED',
    requiresHumanReview: false,
    autoAction: 'kick',
    reviewedBy: 'admin_1',
    createdAt: '2026-05-18T21:40:00Z',
  },
  {
    id: 'rep_5',
    playerId: 'player_19', // Arman_Apex (banned)
    matchId: 'match_5',
    detectionType: 'NO_RECOIL',
    confidence: 0.96,
    reasonCode: 'MOUSE_INPUT_COMPENSATION_PATTERN',
    requiresHumanReview: false,
    autoAction: 'kick',
    reviewedBy: 'admin_1',
    createdAt: '2026-05-18T21:10:00Z',
  },
  // Other various detection events
  {
    id: 'rep_6',
    playerId: 'player_2',
    matchId: 'match_1',
    detectionType: 'RADAR_HACK',
    confidence: 0.42,
    reasonCode: 'SUSPICIOUS_WEB_SOCKET_COMMUNICATION',
    requiresHumanReview: true,
    autoAction: 'none',
    reviewedBy: null,
    createdAt: '2026-05-19T00:05:00Z',
  },
  {
    id: 'rep_7',
    playerId: 'player_4',
    matchId: 'match_2',
    detectionType: 'TRIGGER_BOT',
    confidence: 0.65,
    reasonCode: 'REACTION_TIME_OUTLIER_STDEVS',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-19T00:12:00Z',
  },
  {
    id: 'rep_8',
    playerId: 'player_5',
    matchId: 'match_2',
    detectionType: 'SPEED_HACK',
    confidence: 0.35,
    reasonCode: 'VELOCITY_TICK_THRESHOLD_EXCEEDED',
    requiresHumanReview: true,
    autoAction: 'none',
    reviewedBy: null,
    createdAt: '2026-05-19T00:14:15Z',
  },
  {
    id: 'rep_9',
    playerId: 'player_7',
    matchId: 'match_1',
    detectionType: 'SPOOFER',
    confidence: 0.91,
    reasonCode: 'SMBIOS_SERIAL_FAILED_INTEGRITY',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-19T00:03:00Z',
  },
  {
    id: 'rep_10',
    playerId: 'player_9',
    matchId: 'match_3',
    detectionType: 'ARDUINO_INPUT',
    confidence: 0.72,
    reasonCode: 'ARDUINO_USB_CONTROLLER_DETECTED',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-19T00:21:00Z',
  },
  {
    id: 'rep_11',
    playerId: 'player_10',
    matchId: 'match_2',
    detectionType: 'DUAL_PC_STREAM',
    confidence: 0.58,
    reasonCode: 'CAPTURE_CARD_RE-ROUTING_ACTIVE',
    requiresHumanReview: true,
    autoAction: 'none',
    reviewedBy: null,
    createdAt: '2026-05-19T00:11:00Z',
  },
  {
    id: 'rep_12',
    playerId: 'player_11',
    matchId: 'match_2',
    detectionType: 'MACRO_PATTERN',
    confidence: 0.78,
    reasonCode: 'INPUT_TIMING_STRICT_INTERVALS',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-19T00:13:00Z',
  },
  {
    id: 'rep_13',
    playerId: 'player_12',
    matchId: 'match_1',
    detectionType: 'STATISTICAL_OUTLIER',
    confidence: 0.81,
    reasonCode: 'HEADSHOT_RATIO_TREND_OUTLIER',
    requiresHumanReview: true,
    autoAction: 'flag',
    reviewedBy: null,
    createdAt: '2026-05-19T00:08:45Z',
  },
  // Add another 17 items to make a total of 30 mock reports
  ...Array.from({ length: 17 }).map((_, idx) => {
    const pIdx = (idx * 3) % 40;
    const mIdx = idx % 5;
    const typeArr: typeof mockDetectionReports[number]['detectionType'][] = [
      'AIMBOT', 'WALLHACK', 'RADAR_HACK', 'NO_RECOIL', 'DMA_CARD', 'KMBOX', 'SPOOFER'
    ];
    const type = typeArr[idx % typeArr.length];
    const conf = Math.round((0.3 + (idx * 0.05) % 0.69) * 100) / 100;
    return {
      id: `rep_auto_${idx + 14}`,
      playerId: mockPlayers[pIdx].id,
      matchId: mockMatches[mIdx].id,
      detectionType: type,
      confidence: conf,
      reasonCode: `AUTO_GENERATED_CODE_${idx + 100}`,
      requiresHumanReview: conf < 0.95,
      autoAction: (conf > 0.9 ? 'kick' : conf > 0.6 ? 'flag' : 'none') as 'none' | 'flag' | 'kick',
      reviewedBy: null,
      createdAt: new Date(Date.now() - (idx + 1) * 3600 * 1000).toISOString(),
    };
  })
];
