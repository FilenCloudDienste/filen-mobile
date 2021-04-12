import test from 'ava';
import puppeteer from 'puppeteer';
import Configstore from 'configstore';
import {get as getToken} from './index';

const config = new Configstore('google-translate-api');

let browser;

test.before(async () => {
    browser = await puppeteer.launch();
});

test.beforeEach(() => {
    config.clear();
});

test.after(async () => {
    await browser.close();
});

test('check if what we generate equals to what translate.google.com generates', async t => {
    const token = await getToken('hello');
    const page = await browser.newPage();
    await page.goto('https://translate.google.com', {timeout: 10000, waitUntil: 'networkidle2'});
    const pRequest = page.waitForRequest(request => request.url().indexOf('tk=') > 0);
    await page.type('#source', 'hello');
    const request = await pRequest;
    const realToken = request.url().match(/tk=(\d+\.\d+)/i)[1];
    t.is(token.value, realToken);
});

test('support translate.google.cn via opts.tld', async t => {
    const token = await getToken('hi', {tld: 'cn'});
    const page = await browser.newPage();
    await page.goto('https://translate.google.cn', {timeout: 10000, waitUntil: 'networkidle2'});
    const pRequest = page.waitForRequest(request => request.url().indexOf('tk=') > 0);
    await page.type('#source', 'hi');
    const request = await pRequest;
    const realToken = request.url().match(/tk=(\d+\.\d+)/i)[1];
    t.is(token.value, realToken);
});
