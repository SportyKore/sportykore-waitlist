/**
 * Local, Sportykore-owned match sponsorship config. No ad server involved —
 * this is a direct-sold placement shown as a 5s card before kickoff and
 * after full time, timed to the opening/closing commentary.
 *
 * To run a sponsor: fill in name/logo/url/dates below. To turn the feature
 * off, set `name` to null — getActiveSponsor() will then return null and
 * the sponsor card never appears.
 */
export const SPONSOR = {
	name: 'Fred Energy',
	message: 'This match is brought to you by',
	logo: null,
	url: 'https://example.com',
	activeFrom: null,
	activeTo: null,
};

export function getActiveSponsor(sponsor = SPONSOR, now = new Date()) {
	if (!sponsor || !sponsor.name) return null;
	if (sponsor.activeFrom && now < new Date(sponsor.activeFrom)) return null;
	if (sponsor.activeTo && now > new Date(sponsor.activeTo)) return null;
	return sponsor;
}
