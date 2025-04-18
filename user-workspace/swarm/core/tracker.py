import json
import os
from datetime import datetime

class ValueTracker:
    def __init__(self):
        self.logs_dir = 'data'
        os.makedirs(self.logs_dir, exist_ok=True)
        self.returns_log = os.path.join(self.logs_dir, 'returns_log.json')
        self.swarm_log = os.path.join(self.logs_dir, 'swarm_log.json')
        
    def log_task(self, agent_id, task, result):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'agent_id': agent_id,
            'task': task,
            'result': result
        }
        
        self._append_to_json(self.swarm_log, log_entry)
        
        if result.get('success'):
            returns_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'agent_id': agent_id,
                'task_id': task['id'],
                'value': result.get('value', 0.0)
            }
            self._append_to_json(self.returns_log, returns_entry)
    
    def _append_to_json(self, filepath, data):
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                existing = json.load(f)
        else:
            existing = []
        
        existing.append(data)
        
        with open(filepath, 'w') as f:
            json.dump(existing, f, indent=2)
