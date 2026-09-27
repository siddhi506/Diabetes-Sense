// Field definitions drive both the form controls and the request payload keys.
// min/max/step are loose clinical bounds; `hint` is shown under the label.
export const FIELDS = [
  {
    key: 'pregnancies',
    label: 'Pregnancies',
    unit: '',
    hint: 'Number of times pregnant',
    min: 0,
    max: 17,
    step: 1,
    default: 1,
  },
  {
    key: 'glucose',
    label: 'Glucose',
    unit: 'mg/dL',
    hint: 'Plasma glucose, oral glucose tolerance test',
    min: 40,
    max: 250,
    step: 1,
    default: 110,
  },
  {
    key: 'blood_pressure',
    label: 'Blood pressure',
    unit: 'mm Hg',
    hint: 'Diastolic blood pressure',
    min: 40,
    max: 140,
    step: 1,
    default: 72,
  },
  {
    key: 'skin_thickness',
    label: 'Skin thickness',
    unit: 'mm',
    hint: 'Triceps skin fold thickness',
    min: 0,
    max: 99,
    step: 1,
    default: 23,
  },
  {
    key: 'insulin',
    label: 'Insulin',
    unit: 'mu U/mL',
    hint: '2-hour serum insulin',
    min: 0,
    max: 850,
    step: 1,
    default: 80,
  },
  {
    key: 'bmi',
    label: 'BMI',
    unit: 'kg/m²',
    hint: 'Body mass index',
    min: 12,
    max: 67,
    step: 0.1,
    default: 27.5,
  },
  {
    key: 'diabetes_pedigree_function',
    label: 'Pedigree function',
    unit: '',
    hint: 'Likelihood of diabetes based on family history',
    min: 0.05,
    max: 2.5,
    step: 0.01,
    default: 0.47,
  },
  {
    key: 'age',
    label: 'Age',
    unit: 'years',
    hint: '',
    min: 1,
    max: 100,
    step: 1,
    default: 33,
  },
]

export const DEFAULT_VALUES = FIELDS.reduce((acc, f) => {
  acc[f.key] = f.default
  return acc
}, {})
