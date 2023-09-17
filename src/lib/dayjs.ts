import dayjs from 'dayjs';

// most important dayjs plugins
// most of them are likely to be removed

// plugin to change dayjs object into normal js object:
// dayjs().toObject();
// {
//    "date":21,
//    "hours":10,
//    "milliseconds":521,
//    "minutes":53,
//    "months":11,
//    "seconds":13,
//    "years":2021
// }
import toObject from 'dayjs/plugin/toObject';

// // plugin to enable custom formats.
// // it can be used, for example, to extract hour from the date
// // example - current hour: dayjs(new Date()).format('HH:mm').toString()
// // format date: dayjs(new Date()).format('DD.MM.YYYY').toString()
// // list of available formats without plugin:
// // https://day.js.org/docs/en/display/format
// import customParseFormat from 'dayjs/plugin/customParseFormat';
// // date based on the locale
// // e.g. for pl it will be: 21 gru 2021
// import localizedFormat from 'dayjs/plugin/localizedFormat';
// // to display weekdays, month names in locale language
// import localeData from 'dayjs/plugin/localeData';
// // check if the year is leap or not (that means February has 29 days instead of 28)
// import isLeapYear from 'dayjs/plugin/isLeapYear'; // import plugin
// //to check the day of the year
// import dayOfYear from 'dayjs/plugin/dayOfYear';
// // to check the week number
// import weekOfYear from 'dayjs/plugin/weekOfYear';
// // to check the quarten
// import quarterOfYear from 'dayjs/plugin/quarterOfYear';
// // to measure the duration of the time
// // useful to convert units from minutes to hours, days to years, etc.
// import duration from 'dayjs/plugin/duration';
// // humanizez input given by duration - can be useful in generating
// // how long ago particular comment was added (e.g. 4 years ago, 5 minutes ago)
// import relativeTime from 'dayjs/plugin/relativeTime';

import 'dayjs/locale/pl'; // import locale

dayjs.extend(toObject);
// dayjs.extend(isLeapYear);
// dayjs.extend(localizedFormat);
// dayjs.extend(localeData);
// dayjs.extend(dayOfYear);
// dayjs.extend(weekOfYear);
// dayjs.extend(quarterOfYear);
// dayjs.extend(customParseFormat);

// dayjs.extend(duration);
// dayjs.extend(relativeTime);

export default dayjs;
