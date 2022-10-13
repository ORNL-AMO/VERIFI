#include <string>
#ifndef HELPER_H
#define HELPER_H
class Helper
{
public:
    /**
     * @brief
     *
     */
    Helper(){};
};

class AnnualUsage
{
public:
    AnnualUsage(){};
    AnnualUsage(int year, double usage) : year(year), usage(usage){};
    int year;
    double usage;
};

class PredictorUsage 
{
    public: 
        PredictorUsage(){};
        PredictorUsage(double usage, std::string predictorId): usage(usage), predictorId(predictorId){};
        double usage;
        std::string predictorId;
};

#endif //HELPER_H