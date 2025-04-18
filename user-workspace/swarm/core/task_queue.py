import uuid
import random
from datetime import datetime

class TaskQueue:
    def __init__(self):
        self.queue = []
        
    def add_task(self, task_type, params=None):
        task = {
            'id': str(uuid.uuid4())[:8],
            'type': task_type,
            'params': params or {},
            'created_at': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        self.queue.append(task)
        return task
    
    def get_next(self):
        if self.queue:
            return self.queue.pop(0)
        return None
    
    def generate_tasks(self, count=5):
        task_types = ['ad_generation', 'website_build', 'content_creation', 'data_analysis']
        for _ in range(count):
            task_type = random.choice(task_types)
            self.add_task(task_type)
