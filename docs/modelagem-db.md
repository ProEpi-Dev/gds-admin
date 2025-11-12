# ER Diagram (Entity-Relationship)

```mermaid
erDiagram
    LOCATION ||--o{ CONTEXT : "has"
    LOCATION ||--o{ LOCATION : "has_parent"
    USER ||--o{ PARTICIPATION : "has"
    CONTEXT ||--o{ PARTICIPATION : "has"
    USER ||--o{ CONTEXT_MANAGER : "manages"
    CONTEXT ||--o{ CONTEXT_MANAGER : "has"
    PARTICIPATION ||--o{ REPORT : "has"
    CONTEXT ||--o{ FORM : "has"
    FORM ||--o{ FORM_VERSION : "has"
    FORM_VERSION ||--o{ REPORT : "uses"
    
    USER {
        id int PK
        name string
        email string
        created_at date
        updated_at date
        active boolean
    }
    
    CONTEXT {
        id int PK
        location_id int FK
        name string
        description string
        type string
        access_type enum
        created_at date
        updated_at date
        active boolean
    }
    
    LOCATION {
        id int PK
        parent_id int FK
        name string
        latitude decimal
        longitude decimal
        polygons json
        created_at date
        updated_at date
        active boolean
    }
    
    PARTICIPATION {
        id int PK
        user_id int FK
        context_id int FK
        start_date date
        end_date date
        active boolean
        created_at date
        updated_at date
    }
    
    CONTEXT_MANAGER {
        id int PK
        user_id int FK
        context_id int FK
        created_at date
        updated_at date
        active boolean
    }
    
    REPORT {
        id int PK
        participation_id int FK
        report_type enum
        occurrence_location json
        form_version_id int FK
        form_response json
        created_at date
        updated_at date
        active boolean
    }
    
    FORM {
        id int PK
        context_id int FK
        title string
        reference string
        description string
        type enum
        created_at date
        updated_at date
        active boolean
    }
    
    FORM_VERSION {
        id int PK
        form_id int FK
        version_number int
        definition json
        created_at date
        updated_at date
        active boolean
    }
```

# Anotações

## Enums

**access_type** (CONTEXT): PUBLIC | PRIVATE

**access_type** (FORM_VERSION): PUBLIC | PRIVATE

**report_type** (REPORT): POSITIVE | NEGATIVE

**form_type** (FORM): signal,quiz

## Observações

- **FORM.context_id**: Se NULL, o formulário é público e pode ser reutilizado. Se preenchido, é privado do contexto específico.
- **FORM_VERSION.access_type**: Controla se uma versão específica do formulário é pública ou privada para reuso.
