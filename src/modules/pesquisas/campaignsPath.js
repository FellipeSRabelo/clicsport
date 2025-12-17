import { collection, getDocs, limit, query } from 'firebase/firestore';

// Detects whether campaigns are stored under 'escolas' or 'schools' for a given escolaId
export async function resolveCampaignsRoot(db, escolaId) {
  // Default stays in 'escolas' for backward compatibility
  let root = 'escolas';
  if (!escolaId) return root;

  try {
    const snapEscolas = await getDocs(query(collection(db, 'escolas', escolaId, 'campaigns'), limit(1)));
    if (!snapEscolas.empty) {
      return 'escolas';
    }
  } catch (err) {
    console.warn('[resolveCampaignsRoot] falha ao ler /escolas, tentando /schools:', err?.message || err);
    // continue to try /schools
  }

  try {
    const snapSchools = await getDocs(query(collection(db, 'schools', escolaId, 'campaigns'), limit(1)));
    if (!snapSchools.empty) {
      root = 'schools';
    }
  } catch (err) {
    console.error('[resolveCampaignsRoot] falha ao ler /schools:', err?.message || err);
  }

  return root;
}
