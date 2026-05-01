import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTIONS = {
  LENTES: 'lentes',
  ORCAMENTOS: 'orcamentos',
  FORNECEDORES: 'fornecedores',
  NIVEIS_AR_FORNECEDOR: 'niveis_ar_fornecedor',
  LENTES_CONTATO: 'lentes_contato',
  MARCAS_CONTATO: 'marcas_contato',
};

// ========== LENTES ==========
export async function getLentes() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LENTES));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getLenteById(id) {
  // Can be optimized with getDoc, but standardizing for now
  const all = await getLentes();
  return all.find(l => l.id === id);
}

export async function saveLente(lente) {
  if (lente.id) {
    const ref = doc(db, COLLECTIONS.LENTES, lente.id);
    await updateDoc(ref, { ...lente, updatedAt: new Date().toISOString() });
    return lente;
  } else {
    const dataToSave = {
      ...lente,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.LENTES), dataToSave);
    return { ...dataToSave, id: docRef.id };
  }
}

export async function saveLentesEmLote(lentesArray) {
  const now = new Date().toISOString();
  const promises = lentesArray.map(async (l) => {
    const data = { ...l, createdAt: now, updatedAt: now };
    const docRef = await addDoc(collection(db, COLLECTIONS.LENTES), data);
    return { ...data, id: docRef.id };
  });
  return Promise.all(promises);
}

export async function deleteLente(id) {
  const ref = doc(db, COLLECTIONS.LENTES, id);
  await deleteDoc(ref);
}

// ========== LENTES DE CONTATO ==========
export async function getLentesContato() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LENTES_CONTATO));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getLenteContatoById(id) {
  const all = await getLentesContato();
  return all.find(l => l.id === id);
}

export async function saveLenteContato(lente) {
  if (lente.id) {
    const ref = doc(db, COLLECTIONS.LENTES_CONTATO, lente.id);
    await updateDoc(ref, { ...lente, updatedAt: new Date().toISOString() });
    return lente;
  } else {
    const dataToSave = {
      ...lente,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.LENTES_CONTATO), dataToSave);
    return { ...dataToSave, id: docRef.id };
  }
}

export async function deleteLenteContato(id) {
  const ref = doc(db, COLLECTIONS.LENTES_CONTATO, id);
  await deleteDoc(ref);
}


// ========== ORÇAMENTOS ==========
export async function getOrcamentos() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.ORCAMENTOS));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getOrcamentoById(id) {
  const all = await getOrcamentos();
  return all.find(o => o.id === id);
}

export async function saveOrcamento(orcamento) {
  if (orcamento.id) {
    const ref = doc(db, COLLECTIONS.ORCAMENTOS, orcamento.id);
    await updateDoc(ref, { ...orcamento, updatedAt: new Date().toISOString() });
    return orcamento;
  } else {
    const dataToSave = {
      ...orcamento,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.ORCAMENTOS), dataToSave);
    return { ...dataToSave, id: docRef.id };
  }
}

export async function deleteOrcamento(id) {
  const ref = doc(db, COLLECTIONS.ORCAMENTOS, id);
  await deleteDoc(ref);
}

// ========== FORNECEDORES ==========
export async function getFornecedores() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.FORNECEDORES));
  const saved = snapshot.docs.map(doc => doc.data().nome);
  
  if (saved.length === 0) {
    const defaultFornecedores = ['Zeiss', 'Essilor', 'Hoya', 'Tokai', 'Shamir', 'Rodenstock'];
    for (const nome of defaultFornecedores) {
      await addDoc(collection(db, COLLECTIONS.FORNECEDORES), { nome });
    }
    return defaultFornecedores;
  }
  return saved;
}

export async function addFornecedor(nome) {
  const current = await getFornecedores();
  if (!current.includes(nome)) {
    await addDoc(collection(db, COLLECTIONS.FORNECEDORES), { nome });
    current.push(nome);
  }
  return current;
}

// ========== MARCAS LENTES CONTATO ==========
export async function getMarcasContato() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.MARCAS_CONTATO));
  const saved = snapshot.docs.map(doc => doc.data().nome);
  
  if (saved.length === 0) {
    const defaultMarcas = ['CooperVision', 'Bausch + Lomb', 'Johnson & Johnson', 'Alcon', 'Solótica'];
    for (const nome of defaultMarcas) {
      await addDoc(collection(db, COLLECTIONS.MARCAS_CONTATO), { nome });
    }
    return defaultMarcas;
  }
  return saved;
}

export async function addMarcaContato(nome) {
  const current = await getMarcasContato();
  if (!current.includes(nome)) {
    await addDoc(collection(db, COLLECTIONS.MARCAS_CONTATO), { nome });
    current.push(nome);
  }
  return current;
}

// ========== NÍVEIS AR POR FORNECEDOR ==========
export async function getNiveisARFornecedor() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.NIVEIS_AR_FORNECEDOR));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getNiveisARByFornecedor(fornecedor) {
  const q = query(
    collection(db, COLLECTIONS.NIVEIS_AR_FORNECEDOR), 
    where("fornecedor", "==", fornecedor)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export async function saveNiveisARFornecedor(fornecedor, niveis) {
  const existing = await getNiveisARByFornecedor(fornecedor);
  const data = { fornecedor, niveis, updatedAt: new Date().toISOString() };
  
  if (existing) {
    const ref = doc(db, COLLECTIONS.NIVEIS_AR_FORNECEDOR, existing.id);
    await updateDoc(ref, data);
    return { ...data, id: existing.id };
  } else {
    const docRef = await addDoc(collection(db, COLLECTIONS.NIVEIS_AR_FORNECEDOR), data);
    return { ...data, id: docRef.id };
  }
}

export async function deleteNiveisARFornecedor(fornecedor) {
  const existing = await getNiveisARByFornecedor(fornecedor);
  if (existing) {
    await deleteDoc(doc(db, COLLECTIONS.NIVEIS_AR_FORNECEDOR, existing.id));
  }
}

// ========== HELPERS ==========
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function getAntiReflexoLabel(key) {
  const labels = {
    // Zeiss
    'duravision_gold': 'Duravision Gold',
    'duravision_platinum': 'Duravision Platinum',
    'duravision_silver': 'Duravision Silver',
    'duravision_chrome': 'Duravision Chrome',
    // Essilor
    'crizal_prevencia': 'Crizal Prevência',
    'crizal_saphire_hr': 'Crizal Saphire HR',
    'crizal_rock': 'Crizal Rock',
    'crizal_easy_pro': 'Crizal Easy Pro',
    'optifog': 'Optifog',
    'trio_easy_clean': 'Trio Easy Clean',
    'verniz_hc': 'Verniz HC',
    // Genérico
    'sem_ar': 'Sem AR',
    'outro': 'Outro',
  };
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const TIPOS_LENTE = [
  { value: 'multifocal', label: 'Multifocal' },
  { value: 'visao_simples', label: 'Visão Simples' },
];

export const NIVEIS_AR = [
  'duravision_gold',
  'duravision_platinum',
  'duravision_silver',
  'duravision_chrome',
  'sem_ar',
];
