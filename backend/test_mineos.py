import requests
import json
import time
import sys
from datetime import datetime

class MineOSTester:
    def __init__(self, base_url="http://10.10.14.40:8000"):
        self.base_url = base_url
        self.results = []
        self.passed = 0
        self.failed = 0

    def log(self, status, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        icon = {"PASS": "✓", "FAIL": "✗", "INFO": "ℹ", "WARN": "⚠"}.get(status, "?")
        print(f"[{timestamp}] {icon} [{status}] {message}")

        if status == "PASS":
            self.passed += 1
        elif status == "FAIL":
            self.failed += 1

        self.results.append({"time": timestamp, "status": status, "message": message})

    def request(self, method, endpoint, **kwargs):
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.request(method, url, timeout=10, **kwargs)
            return response
        except requests.exceptions.ConnectionError:
            self.log("FAIL", f"Connection refused: {url}")
            return None
        except requests.exceptions.Timeout:
            self.log("FAIL", f"Timeout: {url}")
            return None
        except Exception as e:
            self.log("FAIL", f"Error: {str(e)}")
            return None

    def test_health(self):
        print(f"\n{'='*60}")
        print("TEST 1: SERVER HEALTH")
        print(f"{'='*60}")

        r = self.request("GET", "/health")
        if r is None:
            return False

        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "ok":
                self.log("PASS", f"Server running: {data}")
                return True
            else:
                self.log("FAIL", f"Unexpected response: {data}")
                return False
        else:
            self.log("FAIL", f"Status {r.status_code}: {r.text[:200]}")
            return False

    def test_vehicles_live(self):
        print(f"\n{'='*60}")
        print("TEST 2: VEHICLES LIVE (Supabase)")
        print(f"{'='*60}")

        r = self.request("GET", "/api/vehicles/live")
        if r is None:
            return False

        if r.status_code != 200:
            self.log("FAIL", f"Status {r.status_code}")
            return False

        data = r.json()

        total = data.get("total", 0)
        if total == 12:
            self.log("PASS", f"Total vehicles: {total}")
        else:
            self.log("WARN", f"Total vehicles: {total} (expected 12)")

        source = data.get("source", "")
        if "supabase" in source:
            self.log("PASS", f"Source: {source}")
        else:
            self.log("WARN", f"Source: {source} (expected supabase)")

        active = data.get("active", 0)
        if active <= total:
            self.log("PASS", f"Active: {active}/{total}")
        else:
            self.log("FAIL", f"Active ({active}) > Total ({total}) - BUG!")

        scenario = data.get("scenario", "")
        self.log("INFO", f"Scenario: {scenario}")

        vehicles = data.get("vehicles", [])
        if len(vehicles) > 0:
            v = vehicles[0]
            required_fields = ["vehicle_id", "latitude", "longitude", "speed_kmh", "fuel_pct"]
            missing = [f for f in required_fields if f not in v]
            if not missing:
                self.log("PASS", f"Vehicle fields complete: {list(v.keys())[:5]}")
            else:
                self.log("FAIL", f"Missing fields: {missing}")

        return True

    def test_vehicles_positions(self):
        print(f"\n{'='*60}")
        print("TEST 3: VEHICLES POSITIONS")
        print(f"{'='*60}")

        r = self.request("GET", "/api/vehicles/positions?limit=12")
        if r is None:
            return False

        data = r.json()
        total = data.get("total_vehicles", 0)

        if total == 12:
            self.log("PASS", f"Total positions: {total}")
        else:
            self.log("WARN", f"Total positions: {total} (expected 12)")

        return True

    def test_emissions(self):
        print(f"\n{'='*60}")
        print("TEST 4: EMISSIONS TODAY")
        print(f"{'='*60}")

        r = self.request("GET", "/api/emissions/today")
        if r is None:
            return False

        data = r.json()

        source = data.get("source", "")
        if "supabase" in source:
            self.log("PASS", f"Source: {source}")
        else:
            self.log("WARN", f"Source: {source}")

        co2 = data.get("total_co2_ton", 0)
        limit = data.get("limit_ton", 3.5)
        if co2 <= limit:
            self.log("PASS", f"CO2: {co2}t / {limit}t limit")
        else:
            self.log("WARN", f"CO2: {co2}t EXCEEDS {limit}t limit!")

        vcount = data.get("vehicle_count", 0)
        self.log("INFO", f"Vehicle count: {vcount}")

        return True

    def test_analytics(self):
        print(f"\n{'='*60}")
        print("TEST 5: ANALYTICS PRODUCTION")
        print(f"{'='*60}")

        r = self.request("GET", "/api/analytics/production?period=today")
        if r is None:
            return False

        data = r.json()

        source = data.get("source", "")
        if "supabase" in source or "simulator" in source:
            self.log("PASS", f"Source: {source}")
        else:
            self.log("WARN", f"Source: {source}")

        oee = data.get("avg_fleet_oee_pct", 0)
        if oee <= 100:
            self.log("PASS", f"OEE: {oee}%")
        else:
            self.log("FAIL", f"OEE: {oee}% > 100% - BUG!")

        prod = data.get("total_production_ton", 0)
        if 1000 <= prod <= 50000:
            self.log("PASS", f"Production: {prod} ton")
        else:
            self.log("WARN", f"Production: {prod} ton (unexpected range)")

        return True

    def test_alerts(self):
        print(f"\n{'='*60}")
        print("TEST 6: ALERTS ACTIVE")
        print(f"{'='*60}")

        r = self.request("GET", "/api/alerts/active")
        if r is None:
            return False

        data = r.json()
        alerts = data.get("alerts", [])
        count = len(alerts)

        self.log("INFO", f"Active alerts: {count}")

        if count > 50:
            self.log("WARN", f"Too many alerts ({count}) - consider cleanup")

        if alerts:
            a = alerts[0]
            required = ["id", "alert_type", "severity", "message"]
            missing = [f for f in required if f not in a]
            if not missing:
                self.log("PASS", f"Alert structure valid: {a['severity']}")
            else:
                self.log("FAIL", f"Missing alert fields: {missing}")

        return True

    def test_scenario(self):
        print(f"\n{'='*60}")
        print("TEST 7: SCENARIO CHANGE")
        print(f"{'='*60}")

        scenarios = ["normal", "storm", "fatigue", "incident"]

        for sc in scenarios:
            r = self.request("POST", f"/api/scenario/{sc}")
            if r is None:
                continue

            if r.status_code == 200:
                data = r.json()
                if data.get("scenario") == sc:
                    self.log("PASS", f"Scenario '{sc}' set successfully")
                else:
                    self.log("FAIL", f"Scenario mismatch: {data}")
            else:
                self.log("FAIL", f"Status {r.status_code} for '{sc}'")

            time.sleep(0.5)

        r = self.request("POST", "/api/scenario/normal")
        if r and r.status_code == 200:
            self.log("INFO", "Reset to 'normal' scenario")

        return True

    def test_llm_report(self):
        print(f"\n{'='*60}")
        print("TEST 8: LLM REPORT")
        print(f"{'='*60}")

        start = time.time()
        r = self.request("POST", "/api/llm/report", 
                         json={"scenario": "normal"},
                         headers={"Content-Type": "application/json"})
        elapsed = time.time() - start

        if r is None:
            return False

        if r.status_code != 200:
            self.log("FAIL", f"Status {r.status_code}: {r.text[:200]}")
            return False

        data = r.json()

        if elapsed < 10:
            self.log("PASS", f"Response time: {elapsed:.2f}s")
        else:
            self.log("WARN", f"Response time: {elapsed:.2f}s (slow)")

        reports = data.get("agent_reports", {})
        agents = ["Fleet Management Agent", "Safety K3 Agent", "Emission Agent", "Reclamation Agent"]
        for agent in agents:
            if agent in str(reports):
                self.log("PASS", f"Agent report found: {agent}")
            else:
                self.log("FAIL", f"Missing agent report: {agent}")

        decision = data.get("decision", {})
        if decision.get("priority_level"):
            self.log("PASS", f"Decision: {decision['priority_level']}")
        else:
            self.log("FAIL", "No decision priority_level")

        engine = data.get("engine", "unknown")
        self.log("INFO", f"LLM Engine: {engine}")

        return True

    def test_chat(self):
        print(f"\n{'='*60}")
        print("TEST 9: AI CHAT")
        print(f"{'='*60}")

        questions = [
            "Apa kondisi tambang?",
            "Berapa kendaraan aktif?",
            "Ada alert apa saja?",
        ]

        for q in questions:
            start = time.time()
            r = self.request("POST", "/api/chat",
                             json={"message": q, "history": []},
                             headers={"Content-Type": "application/json"})
            elapsed = time.time() - start

            if r is None:
                continue

            if r.status_code != 200:
                self.log("FAIL", f"Q: '{q}' -> Status {r.status_code}")
                continue

            data = r.json()
            answer = data.get("answer", "")[:80]
            engine = data.get("engine", "unknown")

            if elapsed < 5:
                self.log("PASS", f"Q: '{q[:30]}...' -> {elapsed:.2f}s | {engine}")
            else:
                self.log("WARN", f"Q: '{q[:30]}...' -> {elapsed:.2f}s (slow) | {engine}")

            self.log("INFO", f"Answer: {answer}...")

            time.sleep(1)

        return True

    def test_agents_status(self):
        print(f"\n{'='*60}")
        print("TEST 10: AGENTS STATUS")
        print(f"{'='*60}")

        r = self.request("GET", "/api/agents/status")
        if r is None:
            return False

        data = r.json()

        agents = data.get("agents", [])
        if len(agents) >= 4:
            self.log("PASS", f"Agents count: {len(agents)}")
        else:
            self.log("WARN", f"Agents count: {len(agents)} (expected 4)")

        interval = data.get("cycle_interval_seconds", 0)
        self.log("INFO", f"Cycle interval: {interval}s")

        return True

    def print_summary(self):
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")

        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0

        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Pass Rate: {pass_rate:.1f}%")

        if pass_rate >= 90:
            print(f"\n✓ SYSTEM READY FOR DEMO")
        elif pass_rate >= 70:
            print(f"\n⚠ SYSTEM MOSTLY READY - Check warnings")
        else:
            print(f"\n✗ SYSTEM NOT READY - Fix failures first")

        report_file = f"mineos_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "base_url": self.base_url,
                "summary": {
                    "total": total,
                    "passed": self.passed,
                    "failed": self.failed,
                    "pass_rate": pass_rate
                },
                "results": self.results
            }, f, indent=2)

        print(f"\nReport saved: {report_file}")

    def run_all(self):
        print(f"{'='*60}")
        print("MINEOS BACKEND AUTOMATED TEST")
        print(f"Target: {self.base_url}")
        print(f"{'='*60}")

        tests = [
            ("Health Check", self.test_health),
            ("Vehicles Live", self.test_vehicles_live),
            ("Vehicles Positions", self.test_vehicles_positions),
            ("Emissions", self.test_emissions),
            ("Analytics", self.test_analytics),
            ("Alerts", self.test_alerts),
            ("Scenario", self.test_scenario),
            ("LLM Report", self.test_llm_report),
            ("Chat", self.test_chat),
            ("Agents Status", self.test_agents_status),
        ]

        for name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log("FAIL", f"Exception in {name}: {str(e)}")

        self.print_summary()


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://10.10.14.40:8000"

    tester = MineOSTester(base_url=url)
    tester.run_all()