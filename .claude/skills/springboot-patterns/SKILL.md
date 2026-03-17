---
name: springboot-patterns
description: Spring Boot 아키텍처 패턴, REST API 설계, 계층형 서비스, 데이터 접근, 캐싱, 비동기 처리, 로깅. Java Spring Boot 백엔드 작업에 사용합니다.
origin: ECC
---

# Spring Boot 개발 패턴

확장 가능하고 프로덕션 수준의 서비스를 위한 Spring Boot 아키텍처 및 API 패턴.

## 활성화 시점

- Spring MVC 또는 WebFlux로 REST API 구축 시
- controller → service → repository 레이어 구조화 시
- Spring Data JPA, 캐싱 또는 비동기 처리 설정 시
- 유효성 검사, 예외 처리 또는 페이지네이션 추가 시
- dev/staging/production 환경을 위한 프로파일 설정 시
- Spring Events 또는 Kafka로 이벤트 주도 패턴 구현 시

## REST API 구조

```java
@RestController
@RequestMapping("/api/markets")
@Validated
class MarketController {
  private final MarketService marketService;

  MarketController(MarketService marketService) {
    this.marketService = marketService;
  }

  @GetMapping
  ResponseEntity<Page<MarketResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Market> markets = marketService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(markets.map(MarketResponse::from));
  }

  @PostMapping
  ResponseEntity<MarketResponse> create(@Valid @RequestBody CreateMarketRequest request) {
    Market market = marketService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(MarketResponse.from(market));
  }
}
```

## Repository 패턴 (Spring Data JPA)

```java
public interface MarketRepository extends JpaRepository<MarketEntity, Long> {
  @Query("select m from MarketEntity m where m.status = :status order by m.volume desc")
  List<MarketEntity> findActive(@Param("status") MarketStatus status, Pageable pageable);
}
```

## 트랜잭션이 있는 서비스 레이어

```java
@Service
public class MarketService {
  private final MarketRepository repo;

  public MarketService(MarketRepository repo) {
    this.repo = repo;
  }

  @Transactional
  public Market create(CreateMarketRequest request) {
    MarketEntity entity = MarketEntity.from(request);
    MarketEntity saved = repo.save(entity);
    return Market.from(saved);
  }
}
```

## DTO와 유효성 검사

```java
public record CreateMarketRequest(
    @NotBlank @Size(max = 200) String name,
    @NotBlank @Size(max = 2000) String description,
    @NotNull @FutureOrPresent Instant endDate,
    @NotEmpty List<@NotBlank String> categories) {}

public record MarketResponse(Long id, String name, MarketStatus status) {
  static MarketResponse from(Market market) {
    return new MarketResponse(market.id(), market.name(), market.status());
  }
}
```

## 예외 처리

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> handleAccessDenied() {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of("Forbidden"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // 스택 추적과 함께 예상치 못한 오류 로깅
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Internal server error"));
  }
}
```

## 캐싱

설정 클래스에 `@EnableCaching`이 필요합니다.

```java
@Service
public class MarketCacheService {
  private final MarketRepository repo;

  public MarketCacheService(MarketRepository repo) {
    this.repo = repo;
  }

  @Cacheable(value = "market", key = "#id")
  public Market getById(Long id) {
    return repo.findById(id)
        .map(Market::from)
        .orElseThrow(() -> new EntityNotFoundException("Market not found"));
  }

  @CacheEvict(value = "market", key = "#id")
  public void evict(Long id) {}
}
```

## 비동기 처리

설정 클래스에 `@EnableAsync`가 필요합니다.

```java
@Service
public class NotificationService {
  @Async
  public CompletableFuture<Void> sendAsync(Notification notification) {
    // 이메일/SMS 전송
    return CompletableFuture.completedFuture(null);
  }
}
```

## 로깅 (SLF4J)

```java
@Service
public class ReportService {
  private static final Logger log = LoggerFactory.getLogger(ReportService.class);

  public Report generate(Long marketId) {
    log.info("generate_report marketId={}", marketId);
    try {
      // 로직
    } catch (Exception ex) {
      log.error("generate_report_failed marketId={}", marketId, ex);
      throw ex;
    }
    return new Report();
  }
}
```

## 미들웨어 / 필터

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    long start = System.currentTimeMillis();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long duration = System.currentTimeMillis() - start;
      log.info("req method={} uri={} status={} durationMs={}",
          request.getMethod(), request.getRequestURI(), response.getStatus(), duration);
    }
  }
}
```

## 페이지네이션과 정렬

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<Market> results = marketService.list(page);
```

## 오류에 강한 외부 호출

```java
public <T> T withRetry(Supplier<T> supplier, int maxRetries) {
  int attempts = 0;
  while (true) {
    try {
      return supplier.get();
    } catch (Exception ex) {
      attempts++;
      if (attempts >= maxRetries) {
        throw ex;
      }
      try {
        Thread.sleep((long) Math.pow(2, attempts) * 100L);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        throw ex;
      }
    }
  }
}
```

## 속도 제한 (Filter + Bucket4j)

**보안 참고**: `X-Forwarded-For` 헤더는 클라이언트가 스푸핑할 수 있으므로 기본적으로 신뢰할 수 없습니다.
포워딩된 헤더는 다음 경우에만 사용하세요:
1. 앱이 신뢰할 수 있는 리버스 프록시(nginx, AWS ALB 등) 뒤에 있을 때
2. `ForwardedHeaderFilter`를 bean으로 등록했을 때
3. application properties에서 `server.forward-headers-strategy=NATIVE` 또는 `FRAMEWORK`를 설정했을 때
4. 프록시가 `X-Forwarded-For` 헤더에 추가하는 것이 아니라 덮어쓰도록 설정되었을 때

`ForwardedHeaderFilter`가 올바르게 설정되면, `request.getRemoteAddr()`은 포워딩된 헤더에서
올바른 클라이언트 IP를 자동으로 반환합니다. 이 설정 없이는 `request.getRemoteAddr()`을
직접 사용하세요 — 즉각적인 연결 IP를 반환하며, 이것이 유일하게 신뢰할 수 있는 값입니다.

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  /*
   * 보안: 이 필터는 속도 제한을 위해 클라이언트를 식별하는 데
   * request.getRemoteAddr()을 사용합니다.
   *
   * 애플리케이션이 리버스 프록시(nginx, AWS ALB 등) 뒤에 있다면, 정확한 클라이언트
   * IP 감지를 위해 Spring이 포워딩된 헤더를 올바르게 처리하도록 설정해야 합니다:
   *
   * 1. application.properties/yaml에서 server.forward-headers-strategy=NATIVE
   *    (클라우드 플랫폼용) 또는 FRAMEWORK 설정
   * 2. FRAMEWORK 전략 사용 시 ForwardedHeaderFilter 등록:
   *
   *    @Bean
   *    ForwardedHeaderFilter forwardedHeaderFilter() {
   *        return new ForwardedHeaderFilter();
   *    }
   *
   * 3. 스푸핑 방지를 위해 프록시가 X-Forwarded-For 헤더를 추가가 아닌 덮어쓰도록 확인
   * 4. 컨테이너에 맞게 server.tomcat.remoteip.trusted-proxies 또는 동등한 설정
   *
   * 이 설정 없이는 request.getRemoteAddr()이 클라이언트 IP 대신 프록시 IP를 반환합니다.
   * 신뢰할 수 있는 프록시 처리 없이 X-Forwarded-For를 직접 읽지 마세요 — 쉽게 스푸핑됩니다.
   */
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    // ForwardedHeaderFilter가 설정되면 올바른 클라이언트 IP를 반환하거나,
    // 그렇지 않으면 직접 연결 IP를 반환하는 getRemoteAddr() 사용.
    // X-Forwarded-For 헤더는 올바른 프록시 설정 없이는 절대 신뢰하지 마세요.
    String clientIp = request.getRemoteAddr();

    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());

    if (bucket.tryConsume(1)) {
      filterChain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

## 백그라운드 작업

Spring의 `@Scheduled`를 사용하거나 큐(예: Kafka, SQS, RabbitMQ)와 통합합니다. 핸들러를 멱등적이고 관찰 가능하게 유지하세요.

## 관찰 가능성

- Logback encoder를 통한 구조화된 로깅 (JSON)
- 메트릭: Micrometer + Prometheus/OTel
- 추적: OpenTelemetry 또는 Brave 백엔드를 사용한 Micrometer Tracing

## 프로덕션 기본값

- 필드 주입 대신 생성자 주입 선호
- RFC 7807 오류를 위해 `spring.mvc.problemdetails.enabled=true` 활성화 (Spring Boot 3+)
- 워크로드에 맞게 HikariCP 풀 크기 설정, 타임아웃 설정
- 쿼리에 `@Transactional(readOnly = true)` 사용
- 적절한 경우 `@NonNull` 및 `Optional`로 null 안전성 강제

**기억하세요**: 컨트롤러는 얇게, 서비스는 집중적으로, 저장소는 단순하게, 오류는 중앙에서 처리하세요. 유지보수성과 테스트 가능성을 최적화하세요.
