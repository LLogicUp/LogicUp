---
name: springboot-tdd
description: JUnit 5, Mockito, MockMvc, Testcontainers, JaCoCo를 사용한 Spring Boot 테스트 주도 개발. 기능 추가, 버그 수정, 리팩토링 시 사용합니다.
origin: ECC
---

# Spring Boot TDD 워크플로

단위 + 통합 테스트 80% 이상 커버리지로 Spring Boot 서비스를 위한 TDD 가이드.

## 사용 시점

- 새로운 기능 또는 엔드포인트
- 버그 수정 또는 리팩토링
- 데이터 접근 로직 또는 보안 규칙 추가 시

## 워크플로

1) 먼저 테스트 작성 (실패해야 함)
2) 통과할 최소한의 코드 구현
3) 테스트가 녹색인 상태에서 리팩토링
4) 커버리지 강제 (JaCoCo)

## 단위 테스트 (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class MarketServiceTest {
  @Mock MarketRepository repo;
  @InjectMocks MarketService service;

  @Test
  void createsMarket() {
    CreateMarketRequest req = new CreateMarketRequest("name", "desc", Instant.now(), List.of("cat"));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Market result = service.create(req);

    assertThat(result.name()).isEqualTo("name");
    verify(repo).save(any());
  }
}
```

패턴:
- Arrange-Act-Assert
- 부분 목 피하기; 명시적 스터빙 선호
- 변형에는 `@ParameterizedTest` 사용

## Web 레이어 테스트 (MockMvc)

```java
@WebMvcTest(MarketController.class)
class MarketControllerTest {
  @Autowired MockMvc mockMvc;
  @MockBean MarketService marketService;

  @Test
  void returnsMarkets() throws Exception {
    when(marketService.list(any())).thenReturn(Page.empty());

    mockMvc.perform(get("/api/markets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }
}
```

## 통합 테스트 (SpringBootTest)

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketIntegrationTest {
  @Autowired MockMvc mockMvc;

  @Test
  void createsMarket() throws Exception {
    mockMvc.perform(post("/api/markets")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Test","description":"Desc","endDate":"2030-01-01T00:00:00Z","categories":["general"]}
        """))
      .andExpect(status().isCreated());
  }
}
```

## 영속성 테스트 (DataJpaTest)

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestContainersConfig.class)
class MarketRepositoryTest {
  @Autowired MarketRepository repo;

  @Test
  void savesAndFinds() {
    MarketEntity entity = new MarketEntity();
    entity.setName("Test");
    repo.save(entity);

    Optional<MarketEntity> found = repo.findByName("Test");
    assertThat(found).isPresent();
  }
}
```

## Testcontainers

- 프로덕션을 미러링하기 위해 Postgres/Redis에 재사용 가능한 컨테이너 사용
- Spring 컨텍스트에 JDBC URL을 주입하기 위해 `@DynamicPropertySource`로 연결

## 커버리지 (JaCoCo)

Maven 설정:
```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.14</version>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>verify</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>
```

## 어서션

- 가독성을 위해 AssertJ (`assertThat`) 선호
- JSON 응답에는 `jsonPath` 사용
- 예외에는: `assertThatThrownBy(...)`

## 테스트 데이터 빌더

```java
class MarketBuilder {
  private String name = "Test";
  MarketBuilder withName(String name) { this.name = name; return this; }
  Market build() { return new Market(null, name, MarketStatus.ACTIVE); }
}
```

## CI 명령어

- Maven: `mvn -T 4 test` 또는 `mvn verify`
- Gradle: `./gradlew test jacocoTestReport`

**기억하세요**: 테스트를 빠르고, 격리되고, 결정론적으로 유지하세요. 구현 세부 사항이 아닌 동작을 테스트하세요.
