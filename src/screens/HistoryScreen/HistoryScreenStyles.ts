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
    gap: 14,
  },
  headerWrap: {
    marginBottom: 20,
    gap: 10,
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#111113',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 8,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
  },
  rowCard: {
    backgroundColor: '#111113',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  rowDate: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    marginTop: 6,
    color: '#a1a1aa',
    fontSize: 13,
  },
  minutesPill: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  minutesText: {
    color: '#09090b',
    fontSize: 14,
    fontWeight: '800',
  },
});
