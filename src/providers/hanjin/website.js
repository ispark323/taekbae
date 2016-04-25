/**
 * Module dependencies.
 */
const
  iconv     = require('iconv-lite'),
  cheerio   = require('cheerio'),
  moment    = require('moment'),
  request   = require('request'),
  Provider  = require('../../lib/provider');


/**
 * HanjinWebsite Class
 */

class HanjinWebsite extends Provider {
  static statusImages = [
    { path: '../img/inquiry/new_process01_on.png', text: '상품 접수' },
    { path: '../img/inquiry/new_process02_on.png', text: '터미널 입고' },
    { path: '../img/inquiry/new_process03_on.png', text: '상품 이동중' },
    { path: '../img/inquiry/new_process04_on.png', text: '배송터미널 도착' },
    { path: '../img/inquiry/new_process05_on.png', text: '배송 출발' },
    { path: '../img/inquiry/new_process06_on.png', text: '배송 완료' }
  ];

  constructor() {
    super();

    this.id = 'hanjin';
    this.name = '한진택배';
    this.source = 'website';
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
      method: 'GET',
      url: 'http://www.hanjin.co.kr/Delivery_html/inquiry/result_waybill.jsp',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36' // eslint-disable-line max-len
      },
      qs: {
        wbl_num: tracking
      },
      timeout: 1000 * 30,
      encoding: null // return response body as Buffer
    }, (e, res, bufBody) => {
      this.handleResponse(e, res, bufBody, (e, bufBody) => {
        if (e) { return done(e); }

        const body = iconv.decode(bufBody, 'euc-kr');
        done(null, body);
      });
    });
  }

  parse(body, done = Provider.noop) {
    process.nextTick(() => {
      let
        $,
        statusImagePath = null,
        $scripts = null,
        status = null,
        trackingChunks = null,
        $tables = null,
        $overall = null;


      try {
        $ = cheerio.load(body);
      } catch (e) {
        return done(e);
      }

      $scripts = $('script')
        .filter((index, el) => !$(el).attr('src'))
        .filter((index, el) => {
          const body = $(el).html();
          return body && ~body.indexOf('result_error.jsp');
        });

      if ($scripts.length) {
        return done(null, null);
      }

      $tables = $('table');

      $overall = $tables
        .filter((index, el) => ~$(el).children('caption').text().indexOf('기본 정보'))
        .find('td');

      if (!$overall.length) {
        return done(new Error('Cannot find element'));
      }


      statusImagePath = $('.new_p img').filter((index, el) => ~$(el).attr('src').indexOf('_on'))
        .attr('src');
      status = HanjinWebsite.statusImages.find((image) => image.path === statusImagePath);

      if (!status) {
        return done(new Error('Cannot parse status'));
      }

      trackingChunks = $overall.eq(0).text().split('\n')
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk);

      const
        payload = {
          provider: {
            id: this.id,
            name: this.name,
            source: this.source
          },
          tracking: trackingChunks[0].replace(/[^0-9]+/g, ''),
          mbl: trackingChunks[1] || null,
          status: status.text,
          content: $overall.eq(1).text().trim(),
          sender: $overall.eq($overall.length - 3).text()
            .replace(/\s+/g, ' ')
            .replace(/님$/, '')
            .trim(),
          recipient: $overall.eq($overall.length - 2).text()
            .replace(/\s+/g, ' ')
            .replace(/님$/, '')
            .trim()
        };

      payload.histories = $tables
        .filter((index, el) => ~$(el).children('caption').text().indexOf('배송진행 상황'))
        .find('tbody > tr')
        .map((index, el) => {
          const
            $columns = $(el).children('th, td'),
            dateStr = $columns.eq(0).text().trim(),
            timeStr = $columns.eq(1).text().trim(),
            status = $columns.eq(3).text().trim();

          return {
            date: moment(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm').toDate(),
            location: $columns.eq(2).text().trim(),
            status
          };
        }).get()
        .sort(Provider.dateComparator());


      payload.sentAt = payload.histories[0].date;
      payload.receivedAt = payload.histories[payload.histories.length - 1].date;

      done(null, payload);
    });
  }
}


module.exports = exports = HanjinWebsite;
