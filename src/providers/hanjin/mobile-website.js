/**
 * Module dependencies.
 */
const
  cheerio   = require('cheerio'),
  moment    = require('moment'),
  request   = require('request'),
  Provider  = require('../../lib/provider');


/**
 * HanjinMobileWebsite Class
 */

class HanjinMobileWebsite extends Provider {
  static statusImages = [
    { path: '/images/recipient/bg_step01.png', text: '상품 접수' },
    { path: '/images/recipient/bg_step02.png', text: '터미널 입고' },
    { path: '/images/recipient/bg_step03.png', text: '상품 이동중' },
    { path: '/images/recipient/bg_step04.png', text: '배송터미널 도착' },
    { path: '/images/recipient/bg_step05.png', text: '배송 출발' },
    { path: '/images/recipient/bg_step06.png', text: '배송 완료' }
  ];

  constructor() {
    super();

    this.id = 'hanjin';
    this.name = '한진택배';
    this.source = 'mobile-website';
    this.TRACKING_REGEXP = /^([0-9]{10}|[0-9]{12})$/;
  }

  validate(tracking, done = Provider.noop) {
    super.validate(tracking, (e, isValid) => {
      if (e || !isValid) { return done(e, isValid); }

      done(null, Provider.validateMagicNumber(tracking));
    });
  }

  fetch(tracking, done = Provider.noop) {
    request({
      method: 'POST',
      url: 'https://m.hanex.hanjin.co.kr/inquiry/incoming/resultWaybill',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36' // eslint-disable-line max-len
      },
      form: {
        div: 'B',
        show: 'true',
        wblNum: tracking
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
        statusImagePath = null,
        baseYear = (new Date()).getFullYear(),
        status = null,
        $tables = null,
        $overall = null;

      try {
        $ = cheerio.load(body);
      } catch (e) {
        return done(e);
      }

      $tables = $('table');

      $overall = $tables
        .filter((index, el) => ~$(el).parent().prev().text().indexOf('기본정보'))
        .find('td');

      if ($('.noData').length) {
        return done(null, null);
      }

      if (!$overall.length) {
        return done(new Error('Cannot find element'));
      }

      const
        payload = {
          provider: {
            id: this.id,
            name: this.name,
            source: this.source
          },
          tracking: $overall.eq(0).text().trim(),
          content: $overall.eq(3).text().trim(),
          sender: $overall.eq(1).text().trim(),
          recipient: $overall.eq(2).text().trim()
        };


      statusImagePath = $('.ship_ing img').attr('src').toLowerCase();
      status = HanjinMobileWebsite.statusImages.find((image) => image.path === statusImagePath);

      if (!status) {
        return done(new Error('Cannot parse status'));
      }

      payload.status = status.text;

      payload.histories = $tables
        .filter((index, el) => ~$(el).parent().prev().text().indexOf('배송상태'))
        .find('tr')
        .map((index, el) => {
          const
            $columns = $(el).children('th, td'),
            dateStr = $columns.eq(0).text().trim(),
            status = $columns.eq(2).text().trim(),
            baseYearMatches = status.match(/([0-9]{4})년/);

          if (baseYearMatches) {
            const [, year] = baseYearMatches;
            baseYear = year;
          }

          return {
            date: moment(`${baseYear}.${dateStr}`, 'YYYY.MM.DD HH:mm').toDate(),
            location: $columns.eq(1).text().trim(),
            status
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


module.exports = exports = HanjinMobileWebsite;
