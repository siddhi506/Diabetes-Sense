import { jsPDF } from 'jspdf'

export function generatePatientReport(result, patientValues) {
  if (!result) return

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const timestamp = new Date().toLocaleString()
  const reportId = 'DS-' + Math.floor(100000 + Math.random() * 900000)

  // Colors
  const brandColor = [46, 111, 107]   // 2e6f6b
  const highRiskColor = [225, 29, 72]  // e11d48
  const lowRiskColor = [22, 163, 74]   // 16a34a
  const darkText = [15, 23, 42]        // 0f172a
  const mutedText = [100, 116, 139]    // 64748b

  let y = 18

  // 1. Header Banner
  doc.setFillColor(...brandColor)
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('DiabetesSense', 14, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Clinical Risk Screening & XAI Report', 14, 20)

  doc.text(`Ref ID: ${reportId}`, pageWidth - 14, 15, { align: 'right' })
  doc.text(`Date: ${timestamp}`, pageWidth - 14, 20, { align: 'right' })

  y = 34

  // 2. Risk Assessment Banner Box
  const isHighRisk = result.risk_label === 'HIGH'
  const riskColor = isHighRisk ? highRiskColor : lowRiskColor
  const riskBg = isHighRisk ? [254, 242, 242] : [240, 253, 244]

  doc.setFillColor(...riskBg)
  doc.setDrawColor(...riskColor)
  doc.setLineWidth(0.8)
  doc.roundedRect(14, y, pageWidth - 28, 30, 3, 3, 'FD')

  doc.setTextColor(...darkText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('ASSESSMENT RESULT', 20, y + 10)

  doc.setFontSize(16)
  doc.setTextColor(...riskColor)
  doc.text(`RISK TIER: ${result.risk_label} RISK`, 20, y + 20)

  doc.setFontSize(11)
  doc.setTextColor(...darkText)
  doc.text(
    `Calibrated Probability: ${(result.risk_probability * 100).toFixed(1)}%`,
    pageWidth - 24,
    y + 12,
    { align: 'right' }
  )
  doc.text(`Confidence Level: ${(result.confidence || 'MODERATE').toUpperCase()}`, pageWidth - 24, y + 20, {
    align: 'right',
  })

  doc.setFontSize(9)
  doc.setTextColor(...mutedText)
  doc.setFont('helvetica', 'italic')
  doc.text(`Model Engine: ${result.model_used || 'Calibrated Random Forest'}`, 20, y + 26)

  y += 38

  // 3. Patient Input Parameters Table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...darkText)
  doc.text('Patient Clinical Parameters', 14, y)
  y += 6

  const paramLabels = [
    { key: 'glucose', label: 'Plasma Glucose', unit: 'mg/dL' },
    { key: 'bmi', label: 'Body Mass Index (BMI)', unit: 'kg/m²' },
    { key: 'age', label: 'Age', unit: 'years' },
    { key: 'blood_pressure', label: 'Diastolic BP', unit: 'mm Hg' },
    { key: 'insulin', label: 'Serum Insulin', unit: 'mu U/mL' },
    { key: 'pregnancies', label: 'Pregnancies', unit: 'count' },
    { key: 'skin_thickness', label: 'Skin Thickness', unit: 'mm' },
    { key: 'diabetes_pedigree_function', label: 'Pedigree Function', unit: 'score' },
  ]

  // Render 2-column parameter grid
  const startY = y
  const colWidth = (pageWidth - 36) / 2
  paramLabels.forEach((p, idx) => {
    const isCol2 = idx >= 4
    const rowIdx = idx % 4
    const posX = isCol2 ? 18 + colWidth : 14
    const posY = startY + rowIdx * 9

    doc.setFillColor(248, 250, 252)
    doc.rect(posX, posY, colWidth - 4, 7, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...darkText)
    doc.text(`${p.label}:`, posX + 3, posY + 5)

    const val = patientValues ? patientValues[p.key] : 'N/A'
    doc.setFont('helvetica', 'bold')
    doc.text(`${val} ${p.unit}`.trim(), posX + colWidth - 8, posY + 5, { align: 'right' })
  })

  y = startY + 4 * 9 + 8

  // 4. SHAP Feature Contribution Breakdown
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...darkText)
  doc.text('SHAP Explainability & Risk Drivers', 14, y)
  y += 6

  // Table Headers
  doc.setFillColor(241, 245, 249)
  doc.rect(14, y, pageWidth - 28, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...darkText)
  doc.text('Feature', 18, y + 5)
  doc.text('Observed Value', 85, y + 5)
  doc.text('SHAP Score', 135, y + 5)
  doc.text('Directional Impact', pageWidth - 18, y + 5, { align: 'right' })
  y += 9

  const factors = result.all_factors || result.top_factors || []
  factors.slice(0, 6).forEach((f) => {
    const isIncrease = f.impact === 'increases_risk'
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...darkText)
    doc.text(f.display_name, 18, y)
    doc.text(`${f.value}`, 85, y)

    doc.setFont('helvetica', 'bold')
    doc.text(f.shap_value > 0 ? `+${f.shap_value}` : `${f.shap_value}`, 135, y)

    doc.setTextColor(...(isIncrease ? highRiskColor : lowRiskColor))
    doc.text(isIncrease ? '▲ Increases Risk' : '▼ Decreases Risk', pageWidth - 18, y, { align: 'right' })

    y += 7
  })

  y += 6

  // 5. Clinical Recommendations
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...darkText)
  doc.text('Personalized Clinical Guidance & Actions', 14, y)
  y += 6

  const recommendations = []
  const glucoseVal = patientValues?.glucose || 0
  const bmiVal = patientValues?.bmi || 0
  const bpVal = patientValues?.blood_pressure || 0

  if (glucoseVal >= 140) {
    recommendations.push('• High Plasma Glucose: Schedule a laboratory HbA1c test and consult a primary care physician.')
  } else if (glucoseVal >= 100) {
    recommendations.push('• Borderline Glucose: Monitor fasting blood glucose and reduce refined sugar intake.')
  } else {
    recommendations.push('• Normal Glucose Maintenance: Continue balanced dietary habits and periodic glucose screening.')
  }

  if (bmiVal >= 30) {
    recommendations.push('• Weight Management: Target 150+ mins/week moderate exercise to improve insulin sensitivity.')
  } else if (bmiVal >= 25) {
    recommendations.push('• Borderline BMI: Maintain an active lifestyle to preserve optimal metabolic regulation.')
  }

  if (bpVal >= 80) {
    recommendations.push('• Blood Pressure Monitoring: Track diastolic pressure weekly to monitor cardiovascular wellness.')
  }

  recommendations.push('• Medical Consultation: Bring this screening summary to your healthcare practitioner for evaluation.')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...darkText)
  recommendations.forEach((rec) => {
    doc.text(rec, 18, y)
    y += 5.5
  })

  // 6. Footer & Medical Disclaimer
  y = doc.internal.pageSize.getHeight() - 20
  doc.setDrawColor(226, 232, 240)
  doc.line(14, y, pageWidth - 14, y)

  y += 5
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...mutedText)
  const disclaimerLines = doc.splitTextToSize(
    'DISCLAIMER: DiabetesSense is an educational and research screening prototype. It is not a medical device and does not provide formal diagnosis. Predictions are based on machine learning probability models and SHAP interpretability approximations. Always consult a certified physician for medical advice.',
    pageWidth - 28
  )
  doc.text(disclaimerLines, 14, y)

  // Save File
  doc.save(`DiabetesSense_Screening_Report_${reportId}.pdf`)
}
