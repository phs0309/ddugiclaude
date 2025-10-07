// 부산 맛집 데이터베이스
const restaurants = [
    // 해운대/센텀 지역
    {
        id: 1,
        name: "해운대암소갈비집",
        address: "부산 해운대구 중동 1394-65",
        description: "50년 전통의 숯불 갈비 전문점, 부드러운 한우갈비가 일품",
        priceRange: "30,000-50,000원",
        category: "한식",
        area: "해운대",
        specialties: ["한우갈비", "갈비탕", "냉면"]
    },
    {
        id: 2,
        name: "송정해수욕장 할매국수",
        address: "부산 해운대구 송정해변로 62",
        description: "40년 전통 손칼국수, 바다 앞에서 먹는 시원한 국물이 별미",
        priceRange: "6,000-8,000원",
        category: "한식",
        area: "송정",
        specialties: ["손칼국수", "비빔국수", "만두"]
    },
    {
        id: 3,
        name: "해운대 소문난삼계탕",
        address: "부산 해운대구 구남로 25",
        description: "인삼과 한약재로 우린 진한 국물, 여름철 보양식으로 유명",
        priceRange: "12,000-15,000원",
        category: "한식",
        area: "해운대",
        specialties: ["삼계탕", "능이백숙", "전복삼계탕"]
    },

    // 서면/부산진 지역
    {
        id: 4,
        name: "서면 돼지국밥 골목",
        address: "부산 부산진구 부전동 212-6",
        description: "부산의 대표 음식 돼지국밥의 본고장, 진한 국물과 수육이 일품",
        priceRange: "8,000-12,000원",
        category: "한식",
        area: "서면",
        specialties: ["돼지국밥", "수육", "순대국"]
    },
    {
        id: 5,
        name: "범일동 밀면거리",
        address: "부산 동구 범일로 84번길",
        description: "부산 3대 면요리 중 하나, 시원하고 쫄깃한 밀면 전문가게들",
        priceRange: "7,000-10,000원",
        category: "한식",
        area: "범일동",
        specialties: ["물밀면", "비빔밀면", "만두"]
    },
    {
        id: 6,
        name: "서면 떡볶이 골목",
        address: "부산 부산진구 서면로68번길",
        description: "부산식 달달한 떡볶이와 튀김이 유명한 분식의 성지",
        priceRange: "3,000-8,000원",
        category: "분식",
        area: "서면",
        specialties: ["떡볶이", "튀김", "김밥"]
    },

    // 남포동/중구 지역
    {
        id: 7,
        name: "자갈치시장 회센터",
        address: "부산 중구 자갈치해안로 52",
        description: "부산 최대 수산시장, 싱싱한 회와 해산물을 현장에서 바로",
        priceRange: "20,000-40,000원",
        category: "해산물",
        area: "자갈치",
        specialties: ["회", "활어구이", "해물탕"]
    },
    {
        id: 8,
        name: "남포동 씨앗호떡",
        address: "부산 중구 광복로55번길 10-3",
        description: "부산의 명물 씨앗호떡, 바삭한 겉과 달콤한 속이 조화로운",
        priceRange: "1,500-3,000원",
        category: "간식",
        area: "남포동",
        specialties: ["씨앗호떡", "견과류호떡"]
    },
    {
        id: 9,
        name: "국제시장 비빔당면",
        address: "부산 중구 신창동4가 12-1",
        description: "50년 전통 비빔당면, 매콤달달한 양념이 일품인 부산 대표 간식",
        priceRange: "4,000-6,000원",
        category: "분식",
        area: "국제시장",
        specialties: ["비빔당면", "어묵", "김밥"]
    },

    // 광안리/수영 지역
    {
        id: 10,
        name: "광안리 횟집거리",
        address: "부산 수영구 광안해변로 219",
        description: "광안대교 야경을 보며 즐기는 싱싱한 회, 부산의 대표 관광지",
        priceRange: "25,000-45,000원",
        category: "해산물",
        area: "광안리",
        specialties: ["회", "매운탕", "조개구이"]
    },
    {
        id: 11,
        name: "수영 곰장어거리",
        address: "부산 수영구 수영로 461번길",
        description: "부산 3대 별미 중 하나인 곰장어, 쫄깃하고 고소한 맛이 일품",
        priceRange: "15,000-25,000원",
        category: "해산물",
        area: "수영",
        specialties: ["곰장어구이", "곰장어탕", "소주"]
    },

    // 기장/정관 지역
    {
        id: 12,
        name: "기장 멸치회 거리",
        address: "부산 기장군 기장읍 차성로 41",
        description: "기장 특산물 멸치를 이용한 멸치회, 달콤하고 쫄깃한 식감",
        priceRange: "10,000-18,000원",
        category: "해산물",
        area: "기장",
        specialties: ["멸치회", "멸치국수", "미역국"]
    },

    // 동래/온천장 지역
    {
        id: 13,
        name: "동래 파전거리",
        address: "부산 동래구 온천천로 51번길",
        description: "부산 3대 별미 파전의 본고장, 바삭하고 고소한 전통 파전",
        priceRange: "12,000-18,000원",
        category: "한식",
        area: "동래",
        specialties: ["동래파전", "막걸리", "전"]
    },
    {
        id: 14,
        name: "온천장 족발거리",
        address: "부산 동래구 온천장로 142",
        description: "쫄깃하고 담백한 족발과 보쌈, 온천장의 대표 먹거리",
        priceRange: "18,000-28,000원",
        category: "한식",
        area: "온천장",
        specialties: ["족발", "보쌈", "막국수"]
    },

    // 부산대/장전동 지역
    {
        id: 15,
        name: "부산대 앞 쭈꾸미거리",
        address: "부산 금정구 장전온천천로 35",
        description: "매콤한 쭈꾸미와 볶음밥이 유명한 대학가 맛집 거리",
        priceRange: "8,000-15,000원",
        category: "한식",
        area: "장전동",
        specialties: ["쭈꾸미볶음", "볶음밥", "소주"]
    },

    // 태종대/영도 지역
    {
        id: 16,
        name: "태종대 갯바위 횟집",
        address: "부산 영도구 전망로 24",
        description: "태종대 절경을 바라보며 먹는 신선한 자연산 회",
        priceRange: "20,000-35,000원",
        category: "해산물",
        area: "태종대",
        specialties: ["자연산회", "전복구이", "해물찜"]
    },

    // 사하구/하단 지역
    {
        id: 17,
        name: "하단 맛집거리",
        address: "부산 사하구 하신번영로 76",
        description: "서민적이고 푸짐한 한식 위주의 동네 맛집들이 모인 거리",
        priceRange: "8,000-15,000원",
        category: "한식",
        area: "하단",
        specialties: ["제육볶음", "김치찌개", "된장찌개"]
    },

    // 연산동 지역
    {
        id: 18,
        name: "연산동 곱창거리",
        address: "부산 연제구 중앙대로 1041",
        description: "쫄깃하고 고소한 곱창과 막창이 유명한 서민 맛집 거리",
        priceRange: "12,000-20,000원",
        category: "한식",
        area: "연산동",
        specialties: ["곱창", "막창", "볶음밥"]
    },

    // 사직/덕천 지역
    {
        id: 19,
        name: "사직야구장 치킨거리",
        address: "부산 동래구 사직로 45",
        description: "야구 경기 후 즐기는 바삭한 치킨과 맥주의 성지",
        priceRange: "15,000-25,000원",
        category: "치킨",
        area: "사직",
        specialties: ["후라이드치킨", "양념치킨", "맥주"]
    },

    // 김해공항/강서 지역
    {
        id: 20,
        name: "강서구 한정식",
        address: "부산 강서구 낙동남로 1240",
        description: "전통 한정식과 계절 별미를 맛볼 수 있는 고급 한식당",
        priceRange: "25,000-40,000원",
        category: "한식",
        area: "강서구",
        specialties: ["한정식", "갈비찜", "전복구이"]
    }
];

export default restaurants;