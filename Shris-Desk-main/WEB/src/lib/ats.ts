type AtsInput = {
  coverLetter?: string | null;
  resumeLink?: string | null;
  desiredRole?: string | null;
  openingTitle?: string | null;
  keywords?: string[] | null;
};

export function calculateAtsScore(input: AtsInput) {
  let score = 50;

  if (input.resumeLink) {
    score += 15;
  }

  if (input.coverLetter && input.coverLetter.trim().length >= 200) {
    score += 20;
  }

  if (input.desiredRole && input.openingTitle) {
    const desired = input.desiredRole.toLowerCase();
    const opening = input.openingTitle.toLowerCase();
    if (opening.includes(desired) || desired.includes(opening)) {
      score += 15;
    }
  }

  if (input.keywords && input.coverLetter) {
    const cover = input.coverLetter.toLowerCase();
    const matches = input.keywords.filter((keyword) => cover.includes(keyword.toLowerCase()));
    score += Math.min(25, matches.length * 5);
  }

  return Math.min(100, Math.max(0, score));
}
