/**
 * WeeklyReportPDF.jsx
 * تقرير PDF أسبوعي لتقدم الطفل
 * يُنشأ بـ @react-pdf/renderer
 */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';

// ============================================
// Arabic Font Registration (Cairo from Google Fonts)
// ============================================
Font.register({
  family: 'Cairo',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hL4-W1Q.ttf', fontWeight: 700 },
  ]
});

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Cairo',
    padding: 40,
    backgroundColor: '#ffffff',
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  logo: {
    fontSize: 28,
    fontWeight: 700,
    color: '#3b82f6',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  statCard: {
    width: '23%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
  },
  streakCard: {
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 15,
  },
  streakRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#92400e',
  },
  streakLabel: {
    fontSize: 11,
    color: '#b45309',
  },
  xpBadge: {
    flexDirection: 'row-reverse',
    gap: 15,
    marginTop: 10,
  },
  xpItem: {
    fontSize: 10,
    color: '#78350f',
  },
  subjectsTable: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#3b82f6',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 10,
    color: '#334155',
    textAlign: 'center',
  },
  col1: { width: '35%' },
  col2: { width: '25%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  motivationBox: {
    padding: 15,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    marginTop: 10,
  },
  motivationText: {
    fontSize: 12,
    color: '#065f46',
    textAlign: 'center',
    fontWeight: 700,
  },
});

// ============================================
// Helper: Get motivational message
// ============================================
function getMotivation(streak, lessonsCompleted, progressPercent) {
  if (progressPercent >= 80) return '🌟 أداء متميز! استمر على هذا المستوى الرائع!';
  if (streak >= 7) return '🔥 سلسلة رائعة! أسبوع كامل من الاجتهاد!';
  if (lessonsCompleted >= 10) return '📚 تقدم ممتاز في الدروس! واصل التعلم!';
  if (streak >= 3) return '💪 بداية قوية! حافظ على استمرارية التعلم!';
  return '🚀 ابدأ رحلة التعلم اليومية وابنِ سلسلتك!';
}

// ============================================
// PDF Document Component
// ============================================
function WeeklyReportDocument({ child, streak, stats, subjects, weekRange }) {
  const today = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>📊 تقرير التقدم</Text>
            <Text style={styles.subtitle}>{weekRange || `حتى ${today}`}</Text>
          </View>
          <Text style={styles.logo}>فاهم</Text>
        </View>

        {/* Child Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 {child.name} — {child.grade}</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View>
              <Text style={styles.streakValue}>🔥 {streak.currentStreak} أيام</Text>
              <Text style={styles.streakLabel}>سلسلة الأيام المتتالية</Text>
            </View>
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.streakValue}>⭐ {streak.xpTotal}</Text>
              <Text style={styles.streakLabel}>نقاط XP</Text>
            </View>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpItem}>🎖️ المستوى: {streak.level}</Text>
            <Text style={styles.xpItem}>🏆 أفضل سلسلة: {streak.bestStreak} أيام</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 ملخص التقدم</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.lessonsCompleted}</Text>
              <Text style={styles.statLabel}>دروس مكتملة</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalLessons}</Text>
              <Text style={styles.statLabel}>إجمالي الدروس</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.progressPercent}%</Text>
              <Text style={styles.statLabel}>تقدّم كلي</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.hoursStudied || 0}</Text>
              <Text style={styles.statLabel}>ساعات دراسة</Text>
            </View>
          </View>
        </View>

        {/* Subjects Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 تقدم المواد</Text>
          <View style={styles.subjectsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.col1]}>المادة</Text>
              <Text style={[styles.tableHeaderText, styles.col2]}>الدروس المكتملة</Text>
              <Text style={[styles.tableHeaderText, styles.col3]}>نسبة الإتقان</Text>
              <Text style={[styles.tableHeaderText, styles.col4]}>الحالة</Text>
            </View>
            {subjects.map((subject, index) => (
              <View key={subject.name} style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.col1]}>{subject.emoji} {subject.name}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{subject.completed}/{subject.total}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{subject.percent}%</Text>
                <Text style={[styles.tableCell, styles.col4]}>
                  {subject.percent >= 80 ? '✅ ممتاز' : subject.percent >= 50 ? '📈 جيد' : '📚 يحتاج مراجعة'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Motivation Box */}
        <View style={styles.motivationBox}>
          <Text style={styles.motivationText}>
            {getMotivation(streak.currentStreak, stats.lessonsCompleted, stats.progressPercent)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>تاريخ التقرير: {today}</Text>
          <Text style={styles.footerText}>منصة فاهم — التعليم المصري بالخارج</Text>
        </View>
      </Page>
    </Document>
  );
}

// ============================================
// Export: Generate PDF Blob
// ============================================
export async function generateWeeklyReport({ child, streak, stats, subjects, weekRange }) {
  const blob = await pdf(
    <WeeklyReportDocument
      child={child}
      streak={streak}
      stats={stats}
      subjects={subjects}
      weekRange={weekRange}
    />
  ).toBlob();
  return blob;
}

// ============================================
// Export: Download PDF
// ============================================
export async function downloadWeeklyReport(data) {
  const blob = await generateWeeklyReport(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `تقرير_${data.child.name}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default WeeklyReportDocument;
