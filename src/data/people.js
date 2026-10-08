
export const STATES = {
  pending: { label: 'Awaiting ID', tone: 'neutral', note: 'Signed up, not yet verified. Cannot trade.' },
  active: { label: 'Active', tone: 'brand', note: 'Verified and trading.' },
  limited: { label: 'Limited', tone: 'warning', note: 'Can browse, cannot post or bid, pending a review.' },
  suspended: { label: 'Suspended', tone: 'alert', note: 'Blocked after a confirmed dispute.' },
}


export const CHANNELS = {
  ussd: { label: 'USSD', note: 'Feature phone — send prices by SMS' },
  android: { label: 'Android', note: 'MkulimaLink app' },
  web: { label: 'Web', note: 'Browser' },
}

export const ROLES = {
  farmer: { label: 'Farmer' },
  buyer: { label: 'Buyer' },
}
