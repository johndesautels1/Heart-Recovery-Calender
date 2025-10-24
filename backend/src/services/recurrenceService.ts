import { RRule, rrulestr } from 'rrule';

export const createRecurrenceRule = (options: RRule.Options) => {
  return new RRule(options);
};

export const getEventOccurrences = (ruleString: string, start: Date, end: Date) => {
  const rule = rrulestr(ruleString);
  return rule.between(start, end, true);
};