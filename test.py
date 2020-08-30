
import json
import threading
import time
from datetime import datetime

import websocket


class Market:
    def __init__(self):
        # 实时行情数据
        self.timeline = []
        self.lastline = []
        self.midline = []
        self.upvolumeline = []
        self.downvolumeline = []
        self.ask_0_pline = []
        self.ask_0_vline = []
        self.bid_0_pline = []
        self.bid_0_vline = []
        self.ask_1_vline = []
        self.bid_1_vline = []
        self.ask_2_vline = []
        self.bid_2_vline = []

        self.mutex = threading.Lock()

        # bar状态数据
        self.purevalues = []
        self.theoreticalpositions = []
        self.need_buyopen_num_strs = []
        self.buyopen_dealnum_strs = []
        self.need_sellopen_num_strs = []
        self.sellopen_dealnum_strs = []
        self.need_sellclose_num_strs = []
        self.need_buyclose_num_strs = []
        self.closetimes = []
        self.closes = []
        self.predictions = []


class OneTokenData(object):
    websocket.enableTrace(True)
    tradeIDs = set()
    worker = None
    AuthFlag = False

    def swap_ticker_tradeinfo_websocket(self):
        while True:
            try:
                OneTokenData.worker = websocket.WebSocketApp(wss_url, on_open=on_open, on_message=on_message,
                                                             on_error=on_error, on_close=on_close, on_pong=on_pong)
                OneTokenData.AuthFlag = False
                OneTokenData.worker.run_forever()
            except Exception as e:
                print('run_forever failed\n{}:'.format(e))
            finally:
                print('run_forever end\n')
                time.sleep(30)

    def seek(self, cid):
        if cid not in OneTokenData.tradeIDs:
            OneTokenData.tradeIDs.add(cid)
            if OneTokenData.worker:
                OneTokenData.worker.close()
                OneTokenData.worker = None
        if not OneTokenData.worker:
            OneTokenData.worker = websocket.WebSocketApp(wss_url,
                                                         on_open=on_open,
                                                         on_message=on_message,
                                                         on_error=on_error,
                                                         on_close=on_close,
                                                         on_pong=on_pong)
            threading.Thread(target=self.swap_ticker_tradeinfo_websocket).start()


def is_mkt_empty(mkt):
    # type: # (Market) -> bool
    return mkt.timeline.__len__() == 1


def empty_auto_reconnect():
    while True:
        time.sleep(30)
        if is_mkt_empty(mkt) and OneTokenData.worker and OneTokenData.worker.keep_running:
            OneTokenData.worker.keep_running = False


def heart_beat_loop():
    while True:
        time.sleep(30)
        if OneTokenData.worker and OneTokenData.worker.keep_running:
            try:
                OneTokenData.worker.send(json.dumps({
                    "uri": "ping"
                }))
            except Exception as e:
                print('unexpected failed\n{}:'.format(e))
                print('mkt timeline len：{}'.format(len(mkt.timeline)))
                OneTokenData.worker.keep_running = False


# 出现错误时执行
def on_error(ws, error):
    print("on_error:{}".format(error))


# 关闭连接时执行
def on_close(ws):
    print("### closed ###")
    ws.keep_running = False
    ws.close()


def on_open(ws):
    try:
        auth = json.dumps({
            "uri": "auth"
        })
        ws.send(auth)

    except Exception as e:
        print(e)
        ws.close()


def on_pong(ws, message):
    print("pong", message)
    ws.send(json.dumps({
        "uri": "ping"
    }))


def timestamp(timestr):
    datetime_obj = datetime.strptime(timestr, '%Y-%m-%dT%H:%M:%S.%f+08:00')
    local_timestamp = time.mktime(datetime_obj.timetuple()) * 1000.0 + datetime_obj.microsecond / 1000.0
    return local_timestamp


def on_message(ws, message):
    msgs = json.loads(message)
    if "uri" in msgs:
        table = msgs["uri"]
        if table == "auth" and msgs["message"] == "Auth succeed." and not OneTokenData.AuthFlag:
            print(msgs["message"])
            for cid in OneTokenData.tradeIDs:
                sub_str = json.dumps({
                    "uri": "subscribe-single-tick-verbose",
                    "contract": cid
                })
                print("subscribe", sub_str)
                ws.send(sub_str)
            OneTokenData.AuthFlag = True
            return
        if table == "single-tick-verbose" and "data" in msgs:
            data = msgs["data"]

            mkt.mutex.acquire()  # lock
            mkt.timeline.append(timestamp(data["time"]))
            mkt.lastline.append(data["last"])
            mkt.midline.append((data["asks"][0]["price"] + data["bids"][0]["price"]) / 2)
            if data["last"] == data["asks"][0]["price"]:
                mkt.upvolumeline.append(data["volume"])
            if data["last"] == data["bids"][0]["price"]:
                mkt.downvolumeline.append(data["volume"])
            # print(data)
            mkt.ask_0_pline.append(data["asks"][0]["price"])
            mkt.ask_0_vline.append(data["asks"][0]["volume"])
            mkt.bid_0_pline.append(data["bids"][0]["price"])
            mkt.bid_0_vline.append(data["bids"][0]["volume"])
            mkt.ask_1_vline.append(data["asks"][1]["volume"])
            mkt.bid_1_vline.append(data["bids"][1]["volume"])
            mkt.ask_2_vline.append(data["asks"][2]["volume"])
            mkt.bid_2_vline.append(data["bids"][2]["volume"])
            mkt.mutex.release()  # lock

if __name__ == '__main__':
    wss_url = "wss://1token.trade/api/v1/ws/tick"
    objectname = "btc.usd.td"

    mkt = Market()

    OneTokenData().seek("okswap/" + objectname)
    # threading.Thread(target=empty_auto_reconnect).start()
    threading.Thread(target=heart_beat_loop).start()

    # 模拟断开连接
    # def close():
    #     while True:
    #         if OneTokenData.worker and OneTokenData.worker.keep_running:
    #             OneTokenData.worker.keep_running = False
    #             time.sleep(180)

    # threading.Thread(target=close).start()
