/**
 * Accounts on the platform, seeded. The fallback for `public.profiles`.
 *
 * Timestamps use `hoursAgo` and resolve against load time, the same way listings
 * do, so the freshness stamps stay honest while you develop.
 *
 * `hoursAgo` must stay at or below 310 (12 days 23 h). The signup chart buckets
 * by calendar day over a 14-day window, and that ceiling keeps every account
 * inside the window no matter what time of day the page is opened.
 *
 * `channel` is how the account was created. It matters here in a way it would not
 * elsewhere: a farmer who signed up over USSD has a feature phone, cannot see the
 * board in a browser, and has to be sent prices by SMS. Support needs to know
 * that before they call. It is also why `profiles.user_id` is nullable — two
 * thirds of these accounts have no login at all.
 */

const SEED = [
  { id: 'u-1189', name: 'Mercy Chebet', role: 'farmer', county: 'Bomet', channel: 'ussd', state: 'pending', hoursAgo: 0.3, deals: 0, gmv: 0, phone: '0722 415 118' },
  { id: 'u-1188', name: 'Sailapu Produce', role: 'buyer', county: 'Nakuru', channel: 'web', state: 'pending', hoursAgo: 1.4, deals: 0, gmv: 0, phone: '0733 902 674' },
  { id: 'u-1187', name: 'Joseph Kimani', role: 'farmer', county: 'Nyandarua', channel: 'android', state: 'pending', hoursAgo: 6, deals: 0, gmv: 0, phone: '0710 336 291' },
  { id: 'u-1186', name: 'Halima Yusuf', role: 'farmer', county: 'Taita Taveta', channel: 'ussd', state: 'active', hoursAgo: 19, deals: 1, gmv: 68_400, phone: '0729 118 540' },
  { id: 'u-1185', name: 'Peter Njoroge', role: 'farmer', county: 'Kiambu', channel: 'android', state: 'active', hoursAgo: 26, deals: 2, gmv: 154_800, phone: '0721 447 903' },
  { id: 'u-1184', name: 'Gathoni Kitchens', role: 'buyer', county: 'Kiambu', channel: 'web', state: 'active', hoursAgo: 33, deals: 3, gmv: 402_600, phone: '0700 552 188' },
  { id: 'u-1183', name: 'Eunice Wairimu', role: 'farmer', county: 'Nyeri', channel: 'ussd', state: 'pending', hoursAgo: 44, deals: 0, gmv: 0, phone: '0715 620 774' },
  { id: 'u-1182', name: 'Barasa Njeru', role: 'farmer', county: 'Trans Nzoia', channel: 'android', state: 'active', hoursAgo: 50, deals: 4, gmv: 611_000, phone: '0726 809 315' },
  { id: 'u-1181', name: 'Alice Moraa', role: 'farmer', county: 'Kisii', channel: 'ussd', state: 'active', hoursAgo: 55, deals: 1, gmv: 44_200, phone: '0717 293 660' },
  { id: 'u-1180', name: 'Riverside Grocers', role: 'buyer', county: 'Kiambu', channel: 'web', state: 'active', hoursAgo: 61, deals: 9, gmv: 1_284_000, phone: '0705 774 021' },
  { id: 'u-1179', name: 'Daniel Kiptoo', role: 'farmer', county: 'Uasin Gishu', channel: 'android', state: 'limited', hoursAgo: 66, deals: 1, gmv: 39_500, phone: '0723 501 887' },
  { id: 'u-1178', name: 'Faith Nyambura', role: 'farmer', county: 'Murang’a', channel: 'ussd', state: 'active', hoursAgo: 70, deals: 2, gmv: 96_300, phone: '0718 342 155' },
  { id: 'u-1177', name: 'Simon Mutiso', role: 'farmer', county: 'Machakos', channel: 'ussd', state: 'active', hoursAgo: 79, deals: 3, gmv: 121_700, phone: '0712 668 430' },
  { id: 'u-1176', name: 'Kilimo Fresh Ltd', role: 'buyer', county: 'Nakuru', channel: 'web', state: 'active', hoursAgo: 90, deals: 14, gmv: 2_940_000, phone: '0709 210 366' },
  { id: 'u-1175', name: 'Rebecca Auma', role: 'farmer', county: 'Bungoma', channel: 'ussd', state: 'pending', hoursAgo: 99, deals: 0, gmv: 0, phone: '0714 905 277' },
  { id: 'u-1174', name: 'Stephen Kariuki', role: 'farmer', county: 'Kirinyaga', channel: 'android', state: 'active', hoursAgo: 104, deals: 6, gmv: 788_400, phone: '0720 133 592' },
  { id: 'u-1173', name: 'Mwea Rice & Veg', role: 'buyer', county: 'Kirinyaga', channel: 'web', state: 'active', hoursAgo: 112, deals: 7, gmv: 966_100, phone: '0702 481 730' },
  { id: 'u-1172', name: 'Lucy Wangeci', role: 'farmer', county: 'Nyandarua', channel: 'ussd', state: 'active', hoursAgo: 118, deals: 2, gmv: 87_900, phone: '0716 559 048' },
  { id: 'u-1171', name: 'Elijah Ochieng', role: 'farmer', county: 'Kisii', channel: 'android', state: 'suspended', hoursAgo: 126, deals: 1, gmv: 28_600, phone: '0724 770 213' },
  { id: 'u-1170', name: 'Naserian Sankale', role: 'farmer', county: 'Narok', channel: 'ussd', state: 'active', hoursAgo: 133, deals: 5, gmv: 512_300, phone: '0711 048 695' },
  { id: 'u-1169', name: 'Hotel Sarova Sourcing', role: 'buyer', county: 'Nakuru', channel: 'web', state: 'active', hoursAgo: 140, deals: 22, gmv: 4_118_000, phone: '0703 916 224' },
  { id: 'u-1168', name: 'Zachary Mwenda', role: 'farmer', county: 'Meru', channel: 'android', state: 'active', hoursAgo: 155, deals: 3, gmv: 233_500, phone: '0727 385 901' },
  { id: 'u-1167', name: 'Priscilla Cherono', role: 'farmer', county: 'Bomet', channel: 'ussd', state: 'active', hoursAgo: 172, deals: 4, gmv: 296_700, phone: '0719 604 458' },
  { id: 'u-1166', name: 'Githeri House', role: 'buyer', county: 'Kiambu', channel: 'android', state: 'limited', hoursAgo: 178, deals: 2, gmv: 118_000, phone: '0706 337 862' },
  { id: 'u-1165', name: 'Musa Abdalla', role: 'farmer', county: 'Taita Taveta', channel: 'ussd', state: 'active', hoursAgo: 184, deals: 2, gmv: 74_800, phone: '0713 220 597' },
  { id: 'u-1164', name: 'Wanjiru Kamau', role: 'farmer', county: 'Nyeri', channel: 'android', state: 'active', hoursAgo: 190, deals: 8, gmv: 903_200, phone: '0722 861 340' },
  { id: 'u-1163', name: 'Tabitha Nekesa', role: 'farmer', county: 'Bungoma', channel: 'ussd', state: 'active', hoursAgo: 197, deals: 1, gmv: 41_600, phone: '0715 093 728' },
  { id: 'u-1162', name: 'Karatina Aggregators', role: 'buyer', county: 'Nyeri', channel: 'web', state: 'active', hoursAgo: 205, deals: 18, gmv: 3_366_400, phone: '0708 442 019' },
  { id: 'u-1161', name: 'Boniface Ndegwa', role: 'farmer', county: 'Kiambu', channel: 'android', state: 'active', hoursAgo: 211, deals: 5, gmv: 447_900, phone: '0721 705 286' },
  { id: 'u-1160', name: 'Esther Kanini', role: 'farmer', county: 'Machakos', channel: 'ussd', state: 'active', hoursAgo: 219, deals: 3, gmv: 158_300, phone: '0717 826 604' },
  { id: 'u-1159', name: 'Kipchoge Wekesa', role: 'farmer', county: 'Trans Nzoia', channel: 'android', state: 'active', hoursAgo: 224, deals: 11, gmv: 1_702_500, phone: '0726 314 977' },
  { id: 'u-1158', name: 'Salome Atieno', role: 'farmer', county: 'Kisii', channel: 'ussd', state: 'active', hoursAgo: 229, deals: 2, gmv: 66_100, phone: '0712 550 831' },
  { id: 'u-1157', name: 'Nairobi School Meals', role: 'buyer', county: 'Kiambu', channel: 'web', state: 'active', hoursAgo: 234, deals: 26, gmv: 5_240_800, phone: '0701 668 455' },
  { id: 'u-1156', name: 'Gideon Rotich', role: 'farmer', county: 'Uasin Gishu', channel: 'ussd', state: 'active', hoursAgo: 238, deals: 4, gmv: 318_600, phone: '0723 907 142' },
  { id: 'u-1155', name: 'Margaret Wangari', role: 'farmer', county: 'Murang’a', channel: 'android', state: 'active', hoursAgo: 247, deals: 7, gmv: 622_400, phone: '0720 483 719' },
  { id: 'u-1154', name: 'Coast Fresh Traders', role: 'buyer', county: 'Taita Taveta', channel: 'web', state: 'active', hoursAgo: 258, deals: 12, gmv: 1_998_300, phone: '0704 271 508' },
  { id: 'u-1153', name: 'Vincent Kilonzo', role: 'farmer', county: 'Machakos', channel: 'ussd', state: 'active', hoursAgo: 264, deals: 2, gmv: 92_500, phone: '0718 736 220' },
  { id: 'u-1152', name: 'Jane Wanjiku', role: 'farmer', county: 'Kirinyaga', channel: 'android', state: 'active', hoursAgo: 271, deals: 9, gmv: 1_146_700, phone: '0722 059 384' },
  { id: 'u-1151', name: 'Leonard Osoro', role: 'farmer', county: 'Kisii', channel: 'ussd', state: 'active', hoursAgo: 278, deals: 3, gmv: 137_200, phone: '0716 401 953' },
  { id: 'u-1150', name: 'Nakuru Wholesale Veg', role: 'buyer', county: 'Nakuru', channel: 'web', state: 'active', hoursAgo: 285, deals: 20, gmv: 3_804_500, phone: '0707 155 632' },
  { id: 'u-1149', name: 'Agnes Nyaguthii', role: 'farmer', county: 'Nyeri', channel: 'ussd', state: 'active', hoursAgo: 291, deals: 5, gmv: 361_800, phone: '0713 984 407' },
  { id: 'u-1148', name: 'Hosea Sang', role: 'farmer', county: 'Bomet', channel: 'android', state: 'active', hoursAgo: 297, deals: 6, gmv: 528_900, phone: '0725 612 178' },
  { id: 'u-1147', name: 'Purity Mbaka', role: 'farmer', county: 'Meru', channel: 'ussd', state: 'active', hoursAgo: 303, deals: 4, gmv: 274_600, phone: '0719 337 865' },
  { id: 'u-1146', name: 'Limuru Green Market', role: 'buyer', county: 'Kiambu', channel: 'web', state: 'active', hoursAgo: 308, deals: 16, gmv: 2_612_900, phone: '0705 890 341' },
  { id: 'u-1145', name: 'Nicholas Maina', role: 'farmer', county: 'Nyandarua', channel: 'android', state: 'active', hoursAgo: 310, deals: 10, gmv: 1_337_500, phone: '0721 264 730' },
]

/**
 * Operators see a masked number in lists and the full one on the account itself.
 * A support desk scanning a table does not need 45 phone numbers on screen, and a
 * screenshot of that page will circulate.
 *
 * In live mode the masking happens in `admin_registrations()` instead, so the
 * full numbers never leave the database to draw a table that hides them. This is
 * the seed-mode equivalent, kept identical in output.
 */
export function maskPhone(phone) {
  if (!phone) return null
  return `${phone.slice(0, 4)} ··· ${phone.slice(-3)}`
}

export function seedPeople() {
  return SEED.map((entry) => ({
    ...entry,
    joinedAt: new Date(Date.now() - entry.hoursAgo * 3_600_000),
    phoneMasked: maskPhone(entry.phone),
  }))
}

export { SEED as PEOPLE_SEED }
