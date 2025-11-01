import { RRule, rrulestr, Options } from 'rrule';

export const createRecurrenceRule = (options: Partial<Options>) => {
  return new RRule(options);
};

export const getEventOccurrences = (ruleString: string, start: Date, end: Date) => {
  const rule = rrulestr(ruleString);
  return rule.between(start, end, true);
};