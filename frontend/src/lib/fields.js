// Field definitions drive both the form controls and the request payload keys.
// min/max/step are loose clinical bounds; `hint` is shown under the label.
export const FIELDS = [
  {
    key: 'pregnancies',
    label: 'Pregnancies',
    unit: 'count',
    hint: 'Number of times pregnant',
    min: 0,
    max: 17,
    step: 1,
    default: 1,
  },
  {
    key: 'glucose',
    label: 'Plasma Glucose',
    unit: 'mg/dL',
    hint: 'Fasting / 2h oral glucose tolerance test',
    min: 40,
    max: 250,
    step: 1,
    default: 110,
    getStatus: (val) => {
      if (val < 100) return { label: 'Normal', tone: 'normal' }
      if (val <= 125) return { label: 'Pre-diabetic', tone: 'warning' }
      return { label: 'Elevated Risk', tone: 'critical' }
    },
  },
  {
    key: 'blood_pressure',
    label: 'Diastolic Blood Pressure',
    unit: 'mm Hg',
    hint: 'Resting diastolic blood pressure',
    min: 40,
    max: 140,
    step: 1,
    default: 72,
    getStatus: (val) => {
      if (val < 80) return { label: 'Optimal', tone: 'normal' }
      if (val <= 89) return { label: 'Pre-hypertensive', tone: 'warning' }
      return { label: 'Hypertensive', tone: 'critical' }
    },
  },
  {
    key: 'skin_thickness',
    label: 'Skin Thickness',
    unit: 'mm',
    hint: 'Triceps skin fold measurement',
    min: 0,
    max: 99,
    step: 1,
    default: 23,
    getStatus: (val) => {
      if (val === 0) return { label: 'Imputed', tone: 'neutral' }
      if (val <= 28) return { label: 'Typical', tone: 'normal' }
      return { label: 'Elevated', tone: 'warning' }
    },
  },
  {
    key: 'insulin',
    label: 'Serum Insulin',
    unit: 'mu U/mL',
    hint: '2-hour serum insulin concentration',
    min: 0,
    max: 850,
    step: 1,
    default: 80,
    getStatus: (val) => {
      if (val === 0) return { label: 'Imputed', tone: 'neutral' }
      if (val <= 166) return { label: 'Normal', tone: 'normal' }
      return { label: 'Hyperinsulinemia', tone: 'warning' }
    },
  },
  {
    key: 'bmi',
    label: 'Body Mass Index (BMI)',
    unit: 'kg/m²',
    hint: 'Body mass index ratio [weight / height²]',
    min: 12,
    max: 67,
    step: 0.1,
    default: 27.5,
    getStatus: (val) => {
      if (val < 18.5) return { label: 'Underweight', tone: 'neutral' }
      if (val <= 24.9) return { label: 'Normal weight', tone: 'normal' }
      if (val <= 29.9) return { label: 'Overweight', tone: 'warning' }
      return { label: 'Obese Class', tone: 'critical' }
    },
  },
  {
    key: 'diabetes_pedigree_function',
    label: 'Pedigree Function (DPF)',
    unit: 'score',
    hint: 'Genetic risk score based on family history',
    min: 0.05,
    max: 2.5,
    step: 0.01,
    default: 0.47,
    getStatus: (val) => {
      if (val < 0.4) return { label: 'Low genetic history', tone: 'normal' }
      if (val <= 0.8) return { label: 'Moderate history', tone: 'warning' }
      return { label: 'High familial risk', tone: 'critical' }
    },
  },
  {
    key: 'age',
    label: 'Patient Age',
    unit: 'years',
    hint: 'Chronological age in years',
    min: 18,
    max: 100,
    step: 1,
    default: 33,
    getStatus: (val) => {
      if (val < 35) return { label: 'Young adult', tone: 'normal' }
      if (val <= 50) return { label: 'Middle age', tone: 'warning' }
      return { label: 'Age 50+', tone: 'warning' }
    },
  },
]

export const DEFAULT_VALUES = FIELDS.reduce((acc, f) => {
  acc[f.key] = f.default
  return acc
}, {})

export const CLINICAL_PRESETS = [
  {
    id: 'healthy',
    title: 'Healthy Baseline',
    desc: '24y, normal BMI, optimal fasting glucose',
    tone: 'normal',
    values: {
      pregnancies: 0,
      glucose: 88,
      blood_pressure: 68,
      skin_thickness: 19,
      insulin: 64,
      bmi: 22.4,
      diabetes_pedigree_function: 0.28,
      age: 24,
    },
  },
  {
    id: 'borderline',
    title: 'Pre-Diabetic Risk',
    desc: '44y, impaired glucose, borderline BMI',
    tone: 'warning',
    values: {
      pregnancies: 2,
      glucose: 128,
      blood_pressure: 82,
      skin_thickness: 28,
      insulin: 110,
      bmi: 28.6,
      diabetes_pedigree_function: 0.52,
      age: 44,
    },
  },
  {
    id: 'highrisk',
    title: 'High-Risk Symptomatic',
    desc: '52y, elevated glucose, obesity & high DPF',
    tone: 'critical',
    values: {
      pregnancies: 4,
      glucose: 182,
      blood_pressure: 90,
      skin_thickness: 34,
      insulin: 230,
      bmi: 36.4,
      diabetes_pedigree_function: 0.98,
      age: 52,
    },
  },
  {
    id: 'gestational',
    title: 'Multiparity & Genetics',
    desc: '36y, 6 pregnancies, high familial pedigree',
    tone: 'warning',
    values: {
      pregnancies: 6,
      glucose: 142,
      blood_pressure: 84,
      skin_thickness: 31,
      insulin: 140,
      bmi: 33.2,
      diabetes_pedigree_function: 1.25,
      age: 36,
    },
  },
]
