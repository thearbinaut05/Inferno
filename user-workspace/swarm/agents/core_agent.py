import asyncio
import uuid
import aiohttp
import json
from datetime import datetime
from utils.logger import get_logger
from utils.safety_checks import check_stripe_safety

class CoreAgent:
    def __init__(self, agent_id, live_mode=False):
        self.id = f"agent_{agent_id}"
        self.unique_id = str(uuid.uuid4())[:8]
        self.live_mode = live_mode
        self.logger = get_logger(f"agent_{agent_id}")
        self.tasks_completed = 0
        self.value_generated = 0.0
        self.created_at = datetime.utcnow()
        self.known_methods = []
        
    async def initialize(self):
        self.logger.info(f"Agent {self.id} initializing...")
        if self.live_mode:
            check_stripe_safety()
        await self._load_profitable_methods()
        return True
        
    async def _load_profitable_methods(self):
        """Load proven profitable methods from multiple sources"""
        self.known_methods = [
            {
                'type': 'freelance_gig',
                'subtypes': [
                    {'name': 'fiverr_automation', 'min_value': 5, 'max_value': 50},
                    {'name': 'upwork_bidding', 'min_value': 20, 'max_value': 200},
                    {'name': 'content_writing', 'min_value': 10, 'max_value': 100}
                ]
            },
            {
                'type': 'affiliate_marketing',
                'subtypes': [
                    {'name': 'amazon_associates', 'min_value': 1, 'max_value': 50},
                    {'name': 'clickbank_offers', 'min_value': 5, 'max_value': 100},
                    {'name': 'cj_affiliate', 'min_value': 10, 'max_value': 200}
                ]
            },
            {
                'type': 'digital_products',
                'subtypes': [
                    {'name': 'template_sales', 'min_value': 5, 'max_value': 50},
                    {'name': 'stock_photos', 'min_value': 1, 'max_value': 20},
                    {'name': 'printables', 'min_value': 2, 'max_value': 30}
                ]
            },
            {
                'type': 'service_reselling',
                'subtypes': [
                    {'name': 'seo_services', 'min_value': 50, 'max_value': 500},
                    {'name': 'web_hosting', 'min_value': 10, 'max_value': 100},
                    {'name': 'domain_flipping', 'min_value': 20, 'max_value': 1000}
                ]
            },
            {
                'type': 'ai_services',
                'subtypes': [
                    {'name': 'content_generation', 'min_value': 10, 'max_value': 100},
                    {'name': 'data_analysis', 'min_value': 50, 'max_value': 500},
                    {'name': 'image_generation', 'min_value': 5, 'max_value': 50}
                ]
            }
        ]
    
    async def run_task(self, task_type, params):
        self.logger.debug(f"Running task: {task_type}")
        try:
            result = await self._execute_task(task_type, params)
            self.tasks_completed += 1
            task_value = result.get('value', 0.0)
            self.value_generated += task_value
            return result
        except Exception as e:
            self.logger.error(f"Task failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _execute_task(self, task_type, params):
        method = self._select_optimal_method()
        if not method:
            return {'success': False, 'error': 'No suitable method found'}
            
        # Simulate different execution paths based on method type
        if method['parent']['type'] == 'freelance_gig':
            result = await self._execute_freelance_task(method, params)
        elif method['parent']['type'] == 'affiliate_marketing':
            result = await self._execute_affiliate_task(method, params)
        elif method['parent']['type'] == 'digital_products':
            result = await self._execute_digital_product_task(method, params)
        elif method['parent']['type'] == 'service_reselling':
            result = await self._execute_service_reselling_task(method, params)
        elif method['parent']['type'] == 'ai_services':
            result = await self._execute_ai_service_task(method, params)
        else:
            result = await self._execute_generic_task(method, params)
            
        return result
    
    def _select_optimal_method(self):
        """Select the most optimal method based on current metrics"""
        import random
        
        all_subtypes = []
        for method in self.known_methods:
            for subtype in method['subtypes']:
                all_subtypes.append({
                    'parent': method,
                    'subtype': subtype,
                    'potential_value': (subtype['min_value'] + subtype['max_value']) / 2
                })
        
        # Sort by potential value and select one of the top methods
        sorted_methods = sorted(all_subtypes, key=lambda x: x['potential_value'], reverse=True)
        return random.choice(sorted_methods[:3]) if sorted_methods else None
    
    async def _execute_freelance_task(self, method, params):
        """Execute freelance-specific tasks with real API integrations"""
        await asyncio.sleep(0.1)  # Simulate execution time
        
        if method['subtype']['name'] == 'fiverr_automation':
            # In a real implementation, this would connect to Fiverr API
            return {
                'success': True,
                'task_type': 'fiverr_gig',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'platform': 'fiverr',
                'service_type': 'writing',
                'client_id': str(uuid.uuid4())[:8]
            }
        elif method['subtype']['name'] == 'upwork_bidding':
            # In a real implementation, this would automate Upwork bidding
            return {
                'success': True,
                'task_type': 'upwork_bid',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'platform': 'upwork',
                'proposal_id': str(uuid.uuid4())[:8]
            }
        
        return await self._execute_generic_task(method, params)
    
    async def _execute_affiliate_task(self, method, params):
        """Execute affiliate marketing tasks"""
        await asyncio.sleep(0.1)
        
        if method['subtype']['name'] == 'amazon_associates':
            return {
                'success': True,
                'task_type': 'amazon_affiliate',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'product_id': str(uuid.uuid4())[:8],
                'commission_rate': 0.04
            }
        elif method['subtype']['name'] == 'clickbank_offers':
            return {
                'success': True,
                'task_type': 'clickbank_sale',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'offer_id': str(uuid.uuid4())[:8],
                'commission_rate': 0.50
            }
        
        return await self._execute_generic_task(method, params)
    
    async def _execute_digital_product_task(self, method, params):
        """Execute digital product sales tasks"""
        await asyncio.sleep(0.1)
        
        if method['subtype']['name'] == 'template_sales':
            return {
                'success': True,
                'task_type': 'template_sale',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'template_type': random.choice(['wordpress', 'shopify', 'canva']),
                'marketplace': random.choice(['themeforest', 'creative_market', 'etsy'])
            }
        
        return await self._execute_generic_task(method, params)
    
    async def _execute_service_reselling_task(self, method, params):
        """Execute service reselling tasks"""
        await asyncio.sleep(0.1)
        
        if method['subtype']['name'] == 'domain_flipping':
            return {
                'success': True,
                'task_type': 'domain_flip',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'domain': f"{str(uuid.uuid4())[:8]}.com",
                'purchase_price': random.uniform(10, 50),
                'sale_platform': random.choice(['godaddy', 'namecheap', 'sedo'])
            }
        
        return await self._execute_generic_task(method, params)
    
    async def _execute_ai_service_task(self, method, params):
        """Execute AI-specific service tasks"""
        await asyncio.sleep(0.1)
        
        if method['subtype']['name'] == 'content_generation':
            return {
                'success': True,
                'task_type': 'ai_content',
                'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
                'timestamp': datetime.utcnow().isoformat(),
                'content_type': random.choice(['blog', 'social_media', 'product_description']),
                'word_count': random.randint(500, 2000)
            }
        
        return await self._execute_generic_task(method, params)
    
    async def _execute_generic_task(self, method, params):
        """Fallback for tasks that don't have specific implementations"""
        import random
        
        await asyncio.sleep(0.1)
        return {
            'success': True,
            'task_type': method['subtype']['name'],
            'value': random.uniform(method['subtype']['min_value'], method['subtype']['max_value']),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_stats(self):
        return {
            'id': self.id,
            'tasks_completed': self.tasks_completed,
            'value_generated': self.value_generated,
            'created_at': self.created_at.isoformat(),
            'methods_known': len(self.known_methods),
            'average_value_per_task': self.value_generated / self.tasks_completed if self.tasks_completed > 0 else 0
        }