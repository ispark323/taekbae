/**
 * Module dependencies.
 */
const
  cheerio   = require('cheerio'),
  moment    = require('moment'),
  request   = require('request'),
  Provider  = require('../../lib/provider');


/**
 * EPostWebsite Class
 */
class EPostWebsite extends Provider {
  constructor() {
    super();

    this.id = 'epost';
    this.name = '우체국';
    this.source = 'website';
    this.TRACKING_REGEXP = /^[0-9]{13}$/;
  }

  fetch(tracking, done = Provider.noop) {
    request({
      method: 'GET',
      url: 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm',
      qs: {
        sid1: tracking,
        displayHeader: 'N'
      },
      timeout: 1000 * 30
    }, (e, res, body) => {
      this.handleResponse(e, res, body, done);
    });
  }

  parse(body, done = Provider.noop) {
    process.nextTick(() => {
      let
        $,
        $tables = null,
        $overall = null;

      try {
        $ = cheerio.load(body);
      } catch (e) {
        return done(e);
      }

      $tables = $('table');

      $overall = $tables
        .filter((index, el) => ~$(el).find('th').first().text().indexOf('등기번호'))
        .find('td');

      if (~$overall.text().indexOf('배달정보를 찾지 못했습니다')) {
        return done(null, null);
      }

      if (!$overall.length) {
        return done(new Error('Cannot find element'));
      }

      [$overall.eq(1), $overall.eq(2)].forEach(($el) => {
        $el.find('br').replaceWith('\n');
      });

      const
        sentChunks = $overall.eq(1).text().split('\n'),
        receivedChunks = $overall.eq(2).text().split('\n'),
        payload = {
          provider: {
            id: this.id,
            name: this.name,
            source: this.source
          },
          tracking: $overall.eq(0).text().trim(),
          remarks: $overall.eq(3).text().trim(),
          status: $overall.eq(4).text().trim(),
          sender: sentChunks[0].trim(),
          recipient: receivedChunks[0].trim()
        };


      payload.histories = $tables
        .filter((index, el) => ~$(el).children('caption').text().indexOf('배송진행현황'))
        .last()
        .find('tr')
        .filter((index, el) => $(el).children('td').length)
        .map((index, el) => {
          const
            $columns = $(el).children('td'),
            dateStr = $columns.eq(0).text().trim().replace(/[\/\.]/g, '-'),
            timeStr = $columns.eq(1).text().trim();

          return {
            date: moment(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm').toDate(),
            location: $columns.eq(2).text().trim(),
            status: $columns.eq(3).text().replace(/\s+/g, ' ').trim()
          };
        }).get()
        .sort((a, b) => {
          if (a.date.getTime() > b.date.getTime()) {
            return 1;
          }
          if (a.date.getTime() < b.date.getTime()) {
            return -1;
          }

          return 0;
        });

      payload.sentAt = payload.histories[0].date;
      payload.receivedAt = payload.histories[payload.histories.length - 1].date;

      done(null, payload);
    });
  }
}


module.exports = exports = EPostWebsite;
