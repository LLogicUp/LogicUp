---
name: django-tdd
description: Django testing strategies with pytest-django, TDD methodology, factory_boy, mocking, coverage, and testing Django REST Framework APIs.
origin: ECC
---

# Django TDD 테스팅

pytest, factory_boy, Django REST Framework를 활용한 Django 애플리케이션의 테스트 주도 개발.

## 활성화 시점

- 새로운 Django 애플리케이션 작성 시
- Django REST Framework API 구현 시
- Django 모델, 뷰, 시리얼라이저 테스트 시
- Django 프로젝트의 테스팅 인프라 구축 시

## Django TDD 워크플로

### Red-Green-Refactor 사이클

```python
# Step 1: RED - 실패하는 테스트 작성
def test_user_creation():
    user = User.objects.create_user(email='test@example.com', password='testpass123')
    assert user.email == 'test@example.com'
    assert user.check_password('testpass123')
    assert not user.is_staff

# Step 2: GREEN - 테스트 통과시키기
# User 모델 또는 팩토리 생성

# Step 3: REFACTOR - 테스트를 유지하면서 개선
```

## 설정

### pytest 설정

```ini
# pytest.ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.test
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --reuse-db
    --nomigrations
    --cov=apps
    --cov-report=html
    --cov-report=term-missing
    --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
```

### 테스트 설정

```python
# config/settings/test.py
from .base import *

DEBUG = True
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# 속도를 위한 마이그레이션 비활성화
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# 더 빠른 비밀번호 해싱
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# 이메일 백엔드
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Celery 항상 즉시 실행
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
```

### conftest.py

```python
# tests/conftest.py
import pytest
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture(autouse=True)
def timezone_settings(settings):
    """일관된 타임존 보장."""
    settings.TIME_ZONE = 'UTC'

@pytest.fixture
def user(db):
    """테스트 사용자 생성."""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        username='testuser'
    )

@pytest.fixture
def admin_user(db):
    """관리자 사용자 생성."""
    return User.objects.create_superuser(
        email='admin@example.com',
        password='adminpass123',
        username='admin'
    )

@pytest.fixture
def authenticated_client(client, user):
    """인증된 클라이언트 반환."""
    client.force_login(user)
    return client

@pytest.fixture
def api_client():
    """DRF API 클라이언트 반환."""
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def authenticated_api_client(api_client, user):
    """인증된 API 클라이언트 반환."""
    api_client.force_authenticate(user=user)
    return api_client
```

## Factory Boy

### 팩토리 설정

```python
# tests/factories.py
import factory
from factory import fuzzy
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from apps.products.models import Product, Category

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    """User 모델 팩토리."""

    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.Sequence(lambda n: f"user{n}")
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    is_active = True

class CategoryFactory(factory.django.DjangoModelFactory):
    """Category 모델 팩토리."""

    class Meta:
        model = Category

    name = factory.Faker('word')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower())
    description = factory.Faker('text')

class ProductFactory(factory.django.DjangoModelFactory):
    """Product 모델 팩토리."""

    class Meta:
        model = Product

    name = factory.Faker('sentence', nb_words=3)
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))
    description = factory.Faker('text')
    price = fuzzy.FuzzyDecimal(10.00, 1000.00, 2)
    stock = fuzzy.FuzzyInteger(0, 100)
    is_active = True
    category = factory.SubFactory(CategoryFactory)
    created_by = factory.SubFactory(UserFactory)

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        """상품에 태그 추가."""
        if not create:
            return
        if extracted:
            for tag in extracted:
                self.tags.add(tag)
```

### 팩토리 사용

```python
# tests/test_models.py
import pytest
from tests.factories import ProductFactory, UserFactory

def test_product_creation():
    """팩토리를 사용한 상품 생성 테스트."""
    product = ProductFactory(price=100.00, stock=50)
    assert product.price == 100.00
    assert product.stock == 50
    assert product.is_active is True

def test_product_with_tags():
    """태그가 있는 상품 테스트."""
    tags = [TagFactory(name='electronics'), TagFactory(name='new')]
    product = ProductFactory(tags=tags)
    assert product.tags.count() == 2

def test_multiple_products():
    """여러 상품 생성 테스트."""
    products = ProductFactory.create_batch(10)
    assert len(products) == 10
```

## 모델 테스팅

### 모델 테스트

```python
# tests/test_models.py
import pytest
from django.core.exceptions import ValidationError
from tests.factories import UserFactory, ProductFactory

class TestUserModel:
    """User 모델 테스트."""

    def test_create_user(self, db):
        """일반 사용자 생성 테스트."""
        user = UserFactory(email='test@example.com')
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self, db):
        """슈퍼유저 생성 테스트."""
        user = UserFactory(
            email='admin@example.com',
            is_staff=True,
            is_superuser=True
        )
        assert user.is_staff
        assert user.is_superuser

    def test_user_str(self, db):
        """사용자 문자열 표현 테스트."""
        user = UserFactory(email='test@example.com')
        assert str(user) == 'test@example.com'

class TestProductModel:
    """Product 모델 테스트."""

    def test_product_creation(self, db):
        """상품 생성 테스트."""
        product = ProductFactory()
        assert product.id is not None
        assert product.is_active is True
        assert product.created_at is not None

    def test_product_slug_generation(self, db):
        """자동 슬러그 생성 테스트."""
        product = ProductFactory(name='Test Product')
        assert product.slug == 'test-product'

    def test_product_price_validation(self, db):
        """가격이 음수가 될 수 없는지 테스트."""
        product = ProductFactory(price=-10)
        with pytest.raises(ValidationError):
            product.full_clean()

    def test_product_manager_active(self, db):
        """활성 매니저 메서드 테스트."""
        ProductFactory.create_batch(5, is_active=True)
        ProductFactory.create_batch(3, is_active=False)

        active_count = Product.objects.active().count()
        assert active_count == 5

    def test_product_stock_management(self, db):
        """재고 관리 테스트."""
        product = ProductFactory(stock=10)
        product.reduce_stock(5)
        product.refresh_from_db()
        assert product.stock == 5

        with pytest.raises(ValueError):
            product.reduce_stock(10)  # 재고 부족
```

## 뷰 테스팅

### Django 뷰 테스트

```python
# tests/test_views.py
import pytest
from django.urls import reverse
from tests.factories import ProductFactory, UserFactory

class TestProductViews:
    """상품 뷰 테스트."""

    def test_product_list(self, client, db):
        """상품 목록 뷰 테스트."""
        ProductFactory.create_batch(10)

        response = client.get(reverse('products:list'))

        assert response.status_code == 200
        assert len(response.context['products']) == 10

    def test_product_detail(self, client, db):
        """상품 상세 뷰 테스트."""
        product = ProductFactory()

        response = client.get(reverse('products:detail', kwargs={'slug': product.slug}))

        assert response.status_code == 200
        assert response.context['product'] == product

    def test_product_create_requires_login(self, client, db):
        """상품 생성에 인증이 필요한지 테스트."""
        response = client.get(reverse('products:create'))

        assert response.status_code == 302
        assert response.url.startswith('/accounts/login/')

    def test_product_create_authenticated(self, authenticated_client, db):
        """인증된 사용자로 상품 생성 테스트."""
        response = authenticated_client.get(reverse('products:create'))

        assert response.status_code == 200

    def test_product_create_post(self, authenticated_client, db, category):
        """POST로 상품 생성 테스트."""
        data = {
            'name': 'Test Product',
            'description': 'A test product',
            'price': '99.99',
            'stock': 10,
            'category': category.id,
        }

        response = authenticated_client.post(reverse('products:create'), data)

        assert response.status_code == 302
        assert Product.objects.filter(name='Test Product').exists()
```

## DRF API 테스팅

### 시리얼라이저 테스트

```python
# tests/test_serializers.py
import pytest
from rest_framework.exceptions import ValidationError
from apps.products.serializers import ProductSerializer
from tests.factories import ProductFactory

class TestProductSerializer:
    """ProductSerializer 테스트."""

    def test_serialize_product(self, db):
        """상품 직렬화 테스트."""
        product = ProductFactory()
        serializer = ProductSerializer(product)

        data = serializer.data

        assert data['id'] == product.id
        assert data['name'] == product.name
        assert data['price'] == str(product.price)

    def test_deserialize_product(self, db):
        """상품 데이터 역직렬화 테스트."""
        data = {
            'name': 'Test Product',
            'description': 'Test description',
            'price': '99.99',
            'stock': 10,
            'category': 1,
        }

        serializer = ProductSerializer(data=data)

        assert serializer.is_valid()
        product = serializer.save()

        assert product.name == 'Test Product'
        assert float(product.price) == 99.99

    def test_price_validation(self, db):
        """가격 유효성 검사 테스트."""
        data = {
            'name': 'Test Product',
            'price': '-10.00',
            'stock': 10,
        }

        serializer = ProductSerializer(data=data)

        assert not serializer.is_valid()
        assert 'price' in serializer.errors

    def test_stock_validation(self, db):
        """재고가 음수가 될 수 없는지 테스트."""
        data = {
            'name': 'Test Product',
            'price': '99.99',
            'stock': -5,
        }

        serializer = ProductSerializer(data=data)

        assert not serializer.is_valid()
        assert 'stock' in serializer.errors
```

### API ViewSet 테스트

```python
# tests/test_api.py
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from tests.factories import ProductFactory, UserFactory

class TestProductAPI:
    """상품 API 엔드포인트 테스트."""

    @pytest.fixture
    def api_client(self):
        """API 클라이언트 반환."""
        return APIClient()

    def test_list_products(self, api_client, db):
        """상품 목록 조회 테스트."""
        ProductFactory.create_batch(10)

        url = reverse('api:product-list')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 10

    def test_retrieve_product(self, api_client, db):
        """상품 단건 조회 테스트."""
        product = ProductFactory()

        url = reverse('api:product-detail', kwargs={'pk': product.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == product.id

    def test_create_product_unauthorized(self, api_client, db):
        """인증 없이 상품 생성 테스트."""
        url = reverse('api:product-list')
        data = {'name': 'Test Product', 'price': '99.99'}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_product_authorized(self, authenticated_api_client, db):
        """인증된 사용자로 상품 생성 테스트."""
        url = reverse('api:product-list')
        data = {
            'name': 'Test Product',
            'description': 'Test',
            'price': '99.99',
            'stock': 10,
        }

        response = authenticated_api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Product'

    def test_update_product(self, authenticated_api_client, db):
        """상품 수정 테스트."""
        product = ProductFactory(created_by=authenticated_api_client.user)

        url = reverse('api:product-detail', kwargs={'pk': product.id})
        data = {'name': 'Updated Product'}

        response = authenticated_api_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Product'

    def test_delete_product(self, authenticated_api_client, db):
        """상품 삭제 테스트."""
        product = ProductFactory(created_by=authenticated_api_client.user)

        url = reverse('api:product-detail', kwargs={'pk': product.id})
        response = authenticated_api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_filter_products_by_price(self, api_client, db):
        """가격으로 상품 필터링 테스트."""
        ProductFactory(price=50)
        ProductFactory(price=150)

        url = reverse('api:product-list')
        response = api_client.get(url, {'price_min': 100})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_search_products(self, api_client, db):
        """상품 검색 테스트."""
        ProductFactory(name='Apple iPhone')
        ProductFactory(name='Samsung Galaxy')

        url = reverse('api:product-list')
        response = api_client.get(url, {'search': 'Apple'})

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
```

## 모킹과 패칭

### 외부 서비스 모킹

```python
# tests/test_views.py
from unittest.mock import patch, Mock
import pytest

class TestPaymentView:
    """모킹된 결제 게이트웨이를 사용한 결제 뷰 테스트."""

    @patch('apps.payments.services.stripe')
    def test_successful_payment(self, mock_stripe, client, user, product):
        """모킹된 Stripe로 결제 성공 테스트."""
        # 목 설정
        mock_stripe.Charge.create.return_value = {
            'id': 'ch_123',
            'status': 'succeeded',
            'amount': 9999,
        }

        client.force_login(user)
        response = client.post(reverse('payments:process'), {
            'product_id': product.id,
            'token': 'tok_visa',
        })

        assert response.status_code == 302
        mock_stripe.Charge.create.assert_called_once()

    @patch('apps.payments.services.stripe')
    def test_failed_payment(self, mock_stripe, client, user, product):
        """결제 실패 테스트."""
        mock_stripe.Charge.create.side_effect = Exception('Card declined')

        client.force_login(user)
        response = client.post(reverse('payments:process'), {
            'product_id': product.id,
            'token': 'tok_visa',
        })

        assert response.status_code == 302
        assert 'error' in response.url
```

### 이메일 발송 모킹

```python
# tests/test_email.py
from django.core import mail
from django.test import override_settings

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
def test_order_confirmation_email(db, order):
    """주문 확인 이메일 테스트."""
    order.send_confirmation_email()

    assert len(mail.outbox) == 1
    assert order.user.email in mail.outbox[0].to
    assert 'Order Confirmation' in mail.outbox[0].subject
```

## 통합 테스트

### 전체 흐름 테스트

```python
# tests/test_integration.py
import pytest
from django.urls import reverse
from tests.factories import UserFactory, ProductFactory

class TestCheckoutFlow:
    """전체 결제 흐름 테스트."""

    def test_guest_to_purchase_flow(self, client, db):
        """비회원부터 구매까지 전체 흐름 테스트."""
        # Step 1: 회원가입
        response = client.post(reverse('users:register'), {
            'email': 'test@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
        })
        assert response.status_code == 302

        # Step 2: 로그인
        response = client.post(reverse('users:login'), {
            'email': 'test@example.com',
            'password': 'testpass123',
        })
        assert response.status_code == 302

        # Step 3: 상품 탐색
        product = ProductFactory(price=100)
        response = client.get(reverse('products:detail', kwargs={'slug': product.slug}))
        assert response.status_code == 200

        # Step 4: 장바구니 담기
        response = client.post(reverse('cart:add'), {
            'product_id': product.id,
            'quantity': 1,
        })
        assert response.status_code == 302

        # Step 5: 결제 확인
        response = client.get(reverse('checkout:review'))
        assert response.status_code == 200
        assert product.name in response.content.decode()

        # Step 6: 구매 완료
        with patch('apps.checkout.services.process_payment') as mock_payment:
            mock_payment.return_value = True
            response = client.post(reverse('checkout:complete'))

        assert response.status_code == 302
        assert Order.objects.filter(user__email='test@example.com').exists()
```

## 테스트 모범 사례

### 해야 할 것

- **팩토리 사용**: 수동 객체 생성 대신 팩토리 활용
- **테스트당 하나의 assertion**: 테스트를 집중적으로 유지
- **설명적인 테스트 이름**: `test_user_cannot_delete_others_post`
- **엣지 케이스 테스트**: 빈 입력, None 값, 경계 조건
- **외부 서비스 모킹**: 외부 API에 의존하지 않기
- **픽스처 사용**: 중복 제거
- **권한 테스트**: 인가 동작 확인
- **테스트 속도 유지**: `--reuse-db`와 `--nomigrations` 사용

### 하지 말아야 할 것

- **Django 내부 테스트 금지**: Django가 정상 동작한다고 신뢰할 것
- **서드파티 코드 테스트 금지**: 라이브러리가 정상 동작한다고 신뢰할 것
- **실패하는 테스트 무시 금지**: 모든 테스트가 통과해야 함
- **테스트 간 의존성 금지**: 테스트는 어떤 순서로든 실행 가능해야 함
- **과도한 모킹 금지**: 외부 의존성만 모킹할 것
- **private 메서드 테스트 금지**: public 인터페이스를 테스트할 것
- **운영 데이터베이스 사용 금지**: 항상 테스트 데이터베이스 사용

## 커버리지

### 커버리지 설정

```bash
# 커버리지와 함께 테스트 실행
pytest --cov=apps --cov-report=html --cov-report=term-missing

# HTML 리포트 생성
open htmlcov/index.html
```

### 커버리지 목표

| 컴포넌트 | 목표 커버리지 |
|---------|-------------|
| 모델 | 90%+ |
| 시리얼라이저 | 85%+ |
| 뷰 | 80%+ |
| 서비스 | 90%+ |
| 유틸리티 | 80%+ |
| 전체 | 80%+ |

## 빠른 참조

| 패턴 | 용도 |
|-----|------|
| `@pytest.mark.django_db` | 데이터베이스 접근 활성화 |
| `client` | Django 테스트 클라이언트 |
| `api_client` | DRF API 클라이언트 |
| `factory.create_batch(n)` | 여러 객체 생성 |
| `patch('module.function')` | 외부 의존성 모킹 |
| `override_settings` | 설정 임시 변경 |
| `force_authenticate()` | 테스트에서 인증 우회 |
| `assertRedirects` | 리다이렉트 확인 |
| `assertTemplateUsed` | 템플릿 사용 확인 |
| `mail.outbox` | 발송된 이메일 확인 |

기억하세요: 테스트는 문서입니다. 좋은 테스트는 코드가 어떻게 동작해야 하는지 설명합니다. 간단하고, 읽기 쉽고, 유지보수하기 쉽게 작성하세요.
