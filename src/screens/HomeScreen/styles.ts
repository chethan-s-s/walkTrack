import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 140,
    gap: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  dateLabel: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: -8,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  cardWide: {
    width: '100%',
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  cardLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  cardValue: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  chartCard: {
    backgroundColor: '#111113',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 18,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  chartWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 180,
    gap: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    width: '100%',
    height: 120,
    backgroundColor: '#18181b',
    borderRadius: 18,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 18,
    minHeight: 6,
  },
  barLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  barMinutes: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '700',
  },
});
