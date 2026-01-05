<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | The following language lines contain the default error messages used by
    | the validator class. Some of these rules have multiple versions such
    | as the size rules. Feel free to tweak each of these messages here.
    |
    */

    'accepted' => 'Campul :attribute trebuie sa fie acceptat.',
    'accepted_if' => 'Campul :attribute trebuie sa fie acceptat cand :other este :value.',
    'active_url' => 'Campul :attribute trebuie sa fie un URL valid.',
    'after' => 'Campul :attribute trebuie sa fie o data dupa :date.',
    'after_or_equal' => 'Campul :attribute trebuie sa fie o data dupa sau egala cu :date.',
    'alpha' => 'Campul :attribute trebuie sa contina doar litere.',
    'alpha_dash' => 'Campul :attribute trebuie sa contina doar litere, numere, cratime si underscore-uri.',
    'alpha_num' => 'Campul :attribute trebuie sa contina doar litere si numere.',
    'any_of' => 'Campul :attribute este invalid.',
    'array' => 'Campul :attribute trebuie sa fie un array.',
    'ascii' => 'Campul :attribute trebuie sa contina doar caractere alfanumerice single-byte si simboluri.',
    'before' => 'Campul :attribute trebuie sa fie o data inainte de :date.',
    'before_or_equal' => 'Campul :attribute trebuie sa fie o data inainte sau egala cu :date.',
    'between' => [
        'array' => 'Campul :attribute trebuie sa aiba intre :min si :max elemente.',
        'file' => 'Campul :attribute trebuie sa aiba intre :min si :max kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie intre :min si :max.',
        'string' => 'Campul :attribute trebuie sa aiba intre :min si :max caractere.',
    ],
    'boolean' => 'Campul :attribute trebuie sa fie adevarat sau fals.',
    'can' => 'Campul :attribute contine o valoare neautorizata.',
    'confirmed' => 'Confirmarea campului :attribute nu se potriveste.',
    'contains' => 'Campul :attribute lipseste o valoare necesara.',
    'current_password' => 'Parola este incorecta.',
    'date' => 'Campul :attribute trebuie sa fie o data valida.',
    'date_equals' => 'Campul :attribute trebuie sa fie o data egala cu :date.',
    'date_format' => 'Campul :attribute trebuie sa se potriveasca cu formatul :format.',
    'decimal' => 'Campul :attribute trebuie sa aiba :decimal zecimale.',
    'declined' => 'Campul :attribute trebuie sa fie refuzat.',
    'declined_if' => 'Campul :attribute trebuie sa fie refuzat cand :other este :value.',
    'different' => 'Campul :attribute si :other trebuie sa fie diferite.',
    'digits' => 'Campul :attribute trebuie sa aiba :digits cifre.',
    'digits_between' => 'Campul :attribute trebuie sa aiba intre :min si :max cifre.',
    'dimensions' => 'Campul :attribute are dimensiuni de imagine invalide.',
    'distinct' => 'Campul :attribute are o valoare duplicata.',
    'doesnt_contain' => 'Campul :attribute nu trebuie sa contina niciunul dintre urmatoarele: :values.',
    'doesnt_end_with' => 'Campul :attribute nu trebuie sa se termine cu unul dintre urmatoarele: :values.',
    'doesnt_start_with' => 'Campul :attribute nu trebuie sa inceapa cu unul dintre urmatoarele: :values.',
    'email' => 'Campul :attribute trebuie sa fie o adresa de email valida.',
    'encoding' => 'Campul :attribute trebuie sa fie codat in :encoding.',
    'ends_with' => 'Campul :attribute trebuie sa se termine cu unul dintre urmatoarele: :values.',
    'enum' => 'Valoarea selectata pentru :attribute este invalida.',
    'exists' => 'Valoarea selectata pentru :attribute este invalida.',
    'extensions' => 'Campul :attribute trebuie sa aiba una dintre urmatoarele extensii: :values.',
    'file' => 'Campul :attribute trebuie sa fie un fisier.',
    'filled' => 'Campul :attribute trebuie sa aiba o valoare.',
    'gt' => [
        'array' => 'Campul :attribute trebuie sa aiba mai mult de :value elemente.',
        'file' => 'Campul :attribute trebuie sa fie mai mare de :value kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie mai mare decat :value.',
        'string' => 'Campul :attribute trebuie sa aiba mai mult de :value caractere.',
    ],
    'gte' => [
        'array' => 'Campul :attribute trebuie sa aiba :value elemente sau mai multe.',
        'file' => 'Campul :attribute trebuie sa fie mai mare sau egal cu :value kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie mai mare sau egal cu :value.',
        'string' => 'Campul :attribute trebuie sa aiba :value caractere sau mai multe.',
    ],
    'hex_color' => 'Campul :attribute trebuie sa fie o culoare hexadecimala valida.',
    'image' => 'Campul :attribute trebuie sa fie o imagine.',
    'in' => 'Valoarea selectata pentru :attribute este invalida.',
    'in_array' => 'Campul :attribute trebuie sa existe in :other.',
    'in_array_keys' => 'Campul :attribute trebuie sa contina cel putin una dintre urmatoarele chei: :values.',
    'integer' => 'Campul :attribute trebuie sa fie un numar intreg.',
    'ip' => 'Campul :attribute trebuie sa fie o adresa IP valida.',
    'ipv4' => 'Campul :attribute trebuie sa fie o adresa IPv4 valida.',
    'ipv6' => 'Campul :attribute trebuie sa fie o adresa IPv6 valida.',
    'json' => 'Campul :attribute trebuie sa fie un string JSON valid.',
    'list' => 'Campul :attribute trebuie sa fie o lista.',
    'lowercase' => 'Campul :attribute trebuie sa fie cu litere mici.',
    'lt' => [
        'array' => 'Campul :attribute trebuie sa aiba mai putin de :value elemente.',
        'file' => 'Campul :attribute trebuie sa fie mai mic de :value kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie mai mic decat :value.',
        'string' => 'Campul :attribute trebuie sa aiba mai putin de :value caractere.',
    ],
    'lte' => [
        'array' => 'Campul :attribute nu trebuie sa aiba mai mult de :value elemente.',
        'file' => 'Campul :attribute trebuie sa fie mai mic sau egal cu :value kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie mai mic sau egal cu :value.',
        'string' => 'Campul :attribute trebuie sa aiba :value caractere sau mai putine.',
    ],
    'mac_address' => 'Campul :attribute trebuie sa fie o adresa MAC valida.',
    'max' => [
        'array' => 'Campul :attribute nu trebuie sa aiba mai mult de :max elemente.',
        'file' => 'Campul :attribute nu trebuie sa fie mai mare de :max kilobyti.',
        'numeric' => 'Campul :attribute nu trebuie sa fie mai mare de :max.',
        'string' => 'Campul :attribute nu trebuie sa aiba mai mult de :max caractere.',
    ],
    'max_digits' => 'Campul :attribute nu trebuie sa aiba mai mult de :max cifre.',
    'mimes' => 'Campul :attribute trebuie sa fie un fisier de tipul: :values.',
    'mimetypes' => 'Campul :attribute trebuie sa fie un fisier de tipul: :values.',
    'min' => [
        'array' => 'Campul :attribute trebuie sa aiba cel putin :min elemente.',
        'file' => 'Campul :attribute trebuie sa fie cel putin :min kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie cel putin :min.',
        'string' => 'Campul :attribute trebuie sa aiba cel putin :min caractere.',
    ],
    'min_digits' => 'Campul :attribute trebuie sa aiba cel putin :min cifre.',
    'missing' => 'Campul :attribute trebuie sa lipseasca.',
    'missing_if' => 'Campul :attribute trebuie sa lipseasca cand :other este :value.',
    'missing_unless' => 'Campul :attribute trebuie sa lipseasca daca :other nu este :value.',
    'missing_with' => 'Campul :attribute trebuie sa lipseasca cand :values este prezent.',
    'missing_with_all' => 'Campul :attribute trebuie sa lipseasca cand :values sunt prezente.',
    'multiple_of' => 'Campul :attribute trebuie sa fie un multiplu al lui :value.',
    'not_in' => 'Valoarea selectata pentru :attribute este invalida.',
    'not_regex' => 'Formatul campului :attribute este invalid.',
    'numeric' => 'Campul :attribute trebuie sa fie un numar.',
    'password' => [
        'letters' => 'Campul :attribute trebuie sa contina cel putin o litera.',
        'mixed' => 'Campul :attribute trebuie sa contina cel putin o litera mare si o litera mica.',
        'numbers' => 'Campul :attribute trebuie sa contina cel putin o cifra.',
        'symbols' => 'Campul :attribute trebuie sa contina cel putin un simbol.',
        'uncompromised' => 'Parola data pentru :attribute a aparut intr-o scurgere de date. Te rugam sa alegi o alta :attribute.',
    ],
    'present' => 'Campul :attribute trebuie sa fie prezent.',
    'present_if' => 'Campul :attribute trebuie sa fie prezent cand :other este :value.',
    'present_unless' => 'Campul :attribute trebuie sa fie prezent daca :other nu este :value.',
    'present_with' => 'Campul :attribute trebuie sa fie prezent cand :values este prezent.',
    'present_with_all' => 'Campul :attribute trebuie sa fie prezent cand :values sunt prezente.',
    'prohibited' => 'Campul :attribute este interzis.',
    'prohibited_if' => 'Campul :attribute este interzis cand :other este :value.',
    'prohibited_if_accepted' => 'Campul :attribute este interzis cand :other este acceptat.',
    'prohibited_if_declined' => 'Campul :attribute este interzis cand :other este refuzat.',
    'prohibited_unless' => 'Campul :attribute este interzis daca :other nu este in :values.',
    'prohibits' => 'Campul :attribute interzice prezenta lui :other.',
    'regex' => 'Formatul campului :attribute este invalid.',
    'required' => 'Campul :attribute este obligatoriu.',
    'required_array_keys' => 'Campul :attribute trebuie sa contina intrari pentru: :values.',
    'required_if' => 'Campul :attribute este obligatoriu cand :other este :value.',
    'required_if_accepted' => 'Campul :attribute este obligatoriu cand :other este acceptat.',
    'required_if_declined' => 'Campul :attribute este obligatoriu cand :other este refuzat.',
    'required_unless' => 'Campul :attribute este obligatoriu daca :other nu este in :values.',
    'required_with' => 'Campul :attribute este obligatoriu cand :values este prezent.',
    'required_with_all' => 'Campul :attribute este obligatoriu cand :values sunt prezente.',
    'required_without' => 'Campul :attribute este obligatoriu cand :values nu este prezent.',
    'required_without_all' => 'Campul :attribute este obligatoriu cand niciunul dintre :values nu este prezent.',
    'same' => 'Campul :attribute trebuie sa se potriveasca cu :other.',
    'size' => [
        'array' => 'Campul :attribute trebuie sa contina :size elemente.',
        'file' => 'Campul :attribute trebuie sa fie :size kilobyti.',
        'numeric' => 'Campul :attribute trebuie sa fie :size.',
        'string' => 'Campul :attribute trebuie sa aiba :size caractere.',
    ],
    'starts_with' => 'Campul :attribute trebuie sa inceapa cu unul dintre urmatoarele: :values.',
    'string' => 'Campul :attribute trebuie sa fie un string.',
    'timezone' => 'Campul :attribute trebuie sa fie un fus orar valid.',
    'unique' => 'Campul :attribute a fost deja folosit.',
    'uploaded' => 'Campul :attribute nu a putut fi incarcat.',
    'uppercase' => 'Campul :attribute trebuie sa fie cu litere mari.',
    'url' => 'Campul :attribute trebuie sa fie un URL valid.',
    'ulid' => 'Campul :attribute trebuie sa fie un ULID valid.',
    'uuid' => 'Campul :attribute trebuie sa fie un UUID valid.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | Here you may specify custom validation messages for attributes using the
    | convention "attribute.rule" to name the lines. This makes it quick to
    | specify a specific custom language line for a given attribute rule.
    |
    */

    'custom' => [
        'attribute-name' => [
            'rule-name' => 'custom-message',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes
    |--------------------------------------------------------------------------
    |
    | The following language lines are used to swap our attribute placeholder
    | with something more reader friendly such as "E-Mail Address" instead
    | of "email". This simply helps us make our message more expressive.
    |
    */

    'attributes' => [],

];
